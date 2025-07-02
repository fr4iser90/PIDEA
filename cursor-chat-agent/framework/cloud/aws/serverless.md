# AWS Serverless Architecture

## Overview
AWS Serverless architecture leverages cloud-native services to build scalable, event-driven applications without managing servers. This guide covers modern serverless patterns, best practices, and advanced implementations.

## Core Services

### AWS Lambda Functions
```javascript
// Modern Lambda function with TypeScript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.pathParameters?.id;
    
    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'User ID is required' })
      };
    }

    const command = new GetCommand({
      TableName: process.env.USERS_TABLE,
      Key: { id: userId }
    });

    const result = await docClient.send(command);
    
    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result.Item)
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
```

### Serverless Framework Configuration
```yaml
# serverless.yml
service: modern-serverless-api

frameworkVersion: '3'

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  stage: ${opt:stage, 'dev'}
  environment:
    USERS_TABLE: ${self:service}-users-${self:provider.stage}
    ORDERS_TABLE: ${self:service}-orders-${self:provider.stage}
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - dynamodb:GetItem
            - dynamodb:PutItem
            - dynamodb:UpdateItem
            - dynamodb:DeleteItem
            - dynamodb:Query
            - dynamodb:Scan
          Resource: 
            - "arn:aws:dynamodb:${self:provider.region}:*:table/${self:provider.environment.USERS_TABLE}"
            - "arn:aws:dynamodb:${self:provider.region}:*:table/${self:provider.environment.ORDERS_TABLE}"
  vpc:
    securityGroupIds:
      - sg-xxxxxxxxxxxxxxxxx
    subnetIds:
      - subnet-xxxxxxxxxxxxxxxxx
      - subnet-xxxxxxxxxxxxxxxxx

functions:
  getUser:
    handler: src/handlers/user.getUser
    events:
      - http:
          path: users/{id}
          method: get
          cors: true
          authorizer: 
            name: jwtAuthorizer
            type: jwt
            identitySource: $request.header.Authorization
            issuerUrl: https://cognito-idp.us-east-1.amazonaws.com/us-east-1_xxxxxxxxx
            audience:
              - xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

  createUser:
    handler: src/handlers/user.createUser
    events:
      - http:
          path: users
          method: post
          cors: true
    environment:
      SNS_TOPIC_ARN: !Ref UserCreatedTopic

  processOrder:
    handler: src/handlers/order.processOrder
    events:
      - sqs:
          arn: !GetAtt OrderQueue.Arn
          batchSize: 10
          maximumBatchingWindow: 5

  scheduledTask:
    handler: src/handlers/scheduled.cleanup
    events:
      - schedule: rate(1 day)

resources:
  Resources:
    UsersTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: ${self:provider.environment.USERS_TABLE}
        BillingMode: PAY_PER_REQUEST
        AttributeDefinitions:
          - AttributeName: id
            AttributeType: S
          - AttributeName: email
            AttributeType: S
        KeySchema:
          - AttributeName: id
            KeyType: HASH
        GlobalSecondaryIndexes:
          - IndexName: EmailIndex
            KeySchema:
              - AttributeName: email
                KeyType: HASH
            Projection:
              ProjectionType: ALL

    UserCreatedTopic:
      Type: AWS::SNS::Topic
      Properties:
        TopicName: ${self:service}-user-created-${self:provider.stage}

    OrderQueue:
      Type: AWS::SQS::Queue
      Properties:
        QueueName: ${self:service}-orders-${self:provider.stage}
        VisibilityTimeoutSeconds: 30
        MessageRetentionPeriod: 1209600
        RedrivePolicy:
          deadLetterTargetArn: !GetAtt OrderDLQ.Arn
          maxReceiveCount: 3

    OrderDLQ:
      Type: AWS::SQS::Queue
      Properties:
        QueueName: ${self:service}-orders-dlq-${self:provider.stage}

plugins:
  - serverless-offline
  - serverless-dotenv-plugin
  - serverless-webpack
```

## Event-Driven Architecture

### SQS Message Processing
```javascript
// SQS Lambda handler
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const eventBridge = new EventBridgeClient({});

interface OrderEvent {
  orderId: string;
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  total: number;
}

export const handler = async (event: SQSEvent): Promise<void> => {
  const records: SQSRecord[] = event.Records;
  
  for (const record of records) {
    try {
      const orderEvent: OrderEvent = JSON.parse(record.body);
      
      // Process order
      await processOrder(orderEvent);
      
      // Publish event to EventBridge
      await publishOrderProcessedEvent(orderEvent);
      
    } catch (error) {
      console.error('Error processing record:', error);
      throw error; // This will trigger SQS retry
    }
  }
};

async function processOrder(orderEvent: OrderEvent): Promise<void> {
  // Business logic for order processing
  console.log(`Processing order ${orderEvent.orderId}`);
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000));
}

async function publishOrderProcessedEvent(orderEvent: OrderEvent): Promise<void> {
  const command = new PutEventsCommand({
    Entries: [
      {
        Source: 'order-service',
        DetailType: 'OrderProcessed',
        Detail: JSON.stringify(orderEvent),
        EventBusName: 'default'
      }
    ]
  });
  
  await eventBridge.send(command);
}
```

### EventBridge Integration
```javascript
// EventBridge Lambda handler
import { EventBridgeEvent } from 'aws-lambda';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const sns = new SNSClient({});

interface OrderProcessedEvent {
  orderId: string;
  userId: string;
  total: number;
  processedAt: string;
}

export const handler = async (
  event: EventBridgeEvent<'OrderProcessed', OrderProcessedEvent>
): Promise<void> => {
  const orderEvent = event.detail;
  
  // Send notification to user
  await sendOrderConfirmation(orderEvent);
  
  // Update inventory
  await updateInventory(orderEvent);
  
  // Trigger analytics
  await trackOrderAnalytics(orderEvent);
};

async function sendOrderConfirmation(orderEvent: OrderProcessedEvent): Promise<void> {
  const message = {
    userId: orderEvent.userId,
    subject: 'Order Confirmation',
    body: `Your order ${orderEvent.orderId} has been processed successfully. Total: $${orderEvent.total}`
  };
  
  const command = new PublishCommand({
    TopicArn: process.env.NOTIFICATION_TOPIC_ARN,
    Message: JSON.stringify(message)
  });
  
  await sns.send(command);
}
```

## Advanced Patterns

### Step Functions for Complex Workflows
```javascript
// Step Functions state machine definition
{
  "Comment": "Order Processing Workflow",
  "StartAt": "ValidateOrder",
  "States": {
    "ValidateOrder": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:validate-order",
      "Next": "CheckInventory",
      "Catch": [
        {
          "ErrorEquals": ["ValidationError"],
          "Next": "OrderFailed"
        }
      ]
    },
    "CheckInventory": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:check-inventory",
      "Next": "ProcessPayment",
      "Catch": [
        {
          "ErrorEquals": ["InsufficientInventory"],
          "Next": "OrderFailed"
        }
      ]
    },
    "ProcessPayment": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:process-payment",
      "Next": "UpdateInventory",
      "Catch": [
        {
          "ErrorEquals": ["PaymentFailed"],
          "Next": "OrderFailed"
        }
      ]
    },
    "UpdateInventory": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:update-inventory",
      "Next": "SendNotification",
      "Catch": [
        {
          "ErrorEquals": ["States.ALL"],
          "Next": "CompensatePayment"
        }
      ]
    },
    "SendNotification": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:send-notification",
      "End": true
    },
    "CompensatePayment": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:compensate-payment",
      "Next": "OrderFailed"
    },
    "OrderFailed": {
      "Type": "Fail",
      "Cause": "Order processing failed"
    }
  }
}
```

### API Gateway with Lambda Authorizer
```javascript
// Lambda Authorizer
import { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';
import { verify } from 'jsonwebtoken';

export const handler = async (
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  try {
    const token = event.authorizationToken.replace('Bearer ', '');
    const decoded = verify(token, process.env.JWT_SECRET!);
    
    return {
      principalId: decoded.sub as string,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: event.methodArn
          }
        ]
      },
      context: {
        userId: decoded.sub,
        email: decoded.email,
        role: decoded.role
      }
    };
  } catch (error) {
    throw new Error('Unauthorized');
  }
};
```

## Monitoring and Observability

### CloudWatch Logs and Metrics
```javascript
// Enhanced Lambda with structured logging
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics } from '@aws-lambda-powertools/metrics';
import { Tracer } from '@aws-lambda-powertools/tracer';

const logger = new Logger({ serviceName: 'user-service' });
const metrics = new Metrics({ namespace: 'UserService' });
const tracer = new Tracer({ serviceName: 'user-service' });

export const handler = async (event: any): Promise<any> => {
  const startTime = Date.now();
  
  try {
    logger.info('Processing user request', { 
      userId: event.pathParameters?.id,
      requestId: event.requestContext?.requestId 
    });
    
    // Business logic
    const result = await processUserRequest(event);
    
    // Record metrics
    metrics.addMetric('UserRequestSuccess', 'Count', 1);
    metrics.addMetric('UserRequestDuration', 'Milliseconds', Date.now() - startTime);
    
    logger.info('User request processed successfully', { 
      userId: event.pathParameters?.id,
      duration: Date.now() - startTime 
    });
    
    return result;
  } catch (error) {
    logger.error('User request failed', { 
      error: error.message,
      userId: event.pathParameters?.id 
    });
    
    metrics.addMetric('UserRequestError', 'Count', 1);
    
    throw error;
  }
};
```

### X-Ray Tracing
```javascript
// Lambda with X-Ray tracing
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = captureLambdaHandler(async (event: any) => {
  const userId = event.pathParameters?.id;
  
  const command = new GetCommand({
    TableName: process.env.USERS_TABLE,
    Key: { id: userId }
  });
  
  const result = await docClient.send(command);
  
  return {
    statusCode: 200,
    body: JSON.stringify(result.Item)
  };
});
```

## Best Practices

### Performance Optimization
- Use Lambda Provisioned Concurrency for consistent performance
- Implement connection pooling for databases
- Use Lambda Layers for shared dependencies
- Optimize cold start times with minimal dependencies

### Security
- Use IAM roles with least privilege access
- Encrypt data at rest and in transit
- Implement proper input validation
- Use AWS Secrets Manager for sensitive data

### Cost Optimization
- Monitor Lambda execution times
- Use appropriate memory allocation
- Implement proper error handling to avoid retries
- Use S3 for large file processing

### Scalability
- Design for horizontal scaling
- Use async processing for long-running tasks
- Implement proper error handling and retries
- Use EventBridge for loose coupling 