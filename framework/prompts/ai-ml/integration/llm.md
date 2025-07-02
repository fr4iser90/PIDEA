# LLM Integration

## Overview
Large Language Models (LLMs) integration enables applications to leverage AI capabilities for natural language processing, content generation, and intelligent automation. This guide covers modern LLM integration patterns, best practices, and implementation strategies.

## Core Integration Patterns

### OpenAI Integration
```javascript
// Modern OpenAI client with TypeScript
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat';

class OpenAIService {
  private client: OpenAI;
  private defaultModel = 'gpt-4';
  private maxTokens = 1000;
  private temperature = 0.7;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      maxRetries: 3,
      timeout: 30000
    });
  }

  async generateResponse(
    messages: ChatCompletionMessageParam[],
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      stream?: boolean;
    } = {}
  ) {
    try {
      const completion = await this.client.chat.completions.create({
        model: options.model || this.defaultModel,
        messages,
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature || this.temperature,
        stream: options.stream || false
      });

      return completion.choices[0]?.message?.content;
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error('Failed to generate response');
    }
  }

  async generateStreamingResponse(
    messages: ChatCompletionMessageParam[],
    onChunk: (chunk: string) => void
  ) {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        stream: true
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          onChunk(content);
        }
      }
    } catch (error) {
      console.error('OpenAI Streaming Error:', error);
      throw new Error('Failed to generate streaming response');
    }
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('OpenAI Embeddings Error:', error);
      throw new Error('Failed to generate embeddings');
    }
  }
}
```

### Anthropic Claude Integration
```javascript
// Anthropic Claude client
import Anthropic from '@anthropic-ai/sdk';

class ClaudeService {
  private client: Anthropic;
  private defaultModel = 'claude-3-sonnet-20240229';

  constructor(apiKey: string) {
    this.client = new Anthropic({
      apiKey,
      maxRetries: 3
    });
  }

  async generateResponse(
    prompt: string,
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    } = {}
  ) {
    try {
      const message = await this.client.messages.create({
        model: options.model || this.defaultModel,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
        system: options.systemPrompt || 'You are a helpful assistant.',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      return message.content[0].text;
    } catch (error) {
      console.error('Claude API Error:', error);
      throw new Error('Failed to generate response');
    }
  }

  async generateStreamingResponse(
    prompt: string,
    onChunk: (chunk: string) => void,
    systemPrompt?: string
  ) {
    try {
      const stream = await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: 1000,
        temperature: 0.7,
        system: systemPrompt || 'You are a helpful assistant.',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        stream: true
      });

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta') {
          onChunk(chunk.delta.text);
        }
      }
    } catch (error) {
      console.error('Claude Streaming Error:', error);
      throw new Error('Failed to generate streaming response');
    }
  }
}
```

## Advanced Patterns

### Function Calling
```javascript
// Function calling with OpenAI
interface WeatherFunction {
  name: 'get_weather';
  description: 'Get current weather for a location';
  parameters: {
    type: 'object';
    properties: {
      location: {
        type: 'string';
        description: 'City name or coordinates';
      };
      unit: {
        type: 'string';
        enum: ['celsius', 'fahrenheit'];
        description: 'Temperature unit';
      };
    };
    required: ['location'];
  };
}

class FunctionCallingService {
  private openaiService: OpenAIService;
  private functionRegistry: Map<string, Function> = new Map();

  constructor(openaiService: OpenAIService) {
    this.openaiService = openaiService;
    this.registerFunctions();
  }

  registerFunctions() {
    this.functionRegistry.set('get_weather', this.getWeather.bind(this));
    this.functionRegistry.set('get_time', this.getTime.bind(this));
    this.functionRegistry.set('calculate', this.calculate.bind(this));
  }

  async processWithFunctionCalling(
    userMessage: string,
    availableFunctions: any[]
  ) {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: 'You can call functions to help answer user questions.'
      },
      {
        role: 'user',
        content: userMessage
      }
    ];

    const completion = await this.openaiService.client.chat.completions.create({
      model: 'gpt-4',
      messages,
      functions: availableFunctions,
      function_call: 'auto'
    });

    const responseMessage = completion.choices[0].message;

    if (responseMessage.function_call) {
      const functionName = responseMessage.function_call.name;
      const functionArgs = JSON.parse(responseMessage.function_call.arguments);
      
      const functionToCall = this.functionRegistry.get(functionName);
      if (functionToCall) {
        const functionResult = await functionToCall(functionArgs);
        
        messages.push(responseMessage);
        messages.push({
          role: 'function',
          name: functionName,
          content: JSON.stringify(functionResult)
        });

        const secondResponse = await this.openaiService.client.chat.completions.create({
          model: 'gpt-4',
          messages
        });

        return secondResponse.choices[0].message.content;
      }
    }

    return responseMessage.content;
  }

  async getWeather(args: { location: string; unit?: string }) {
    // Mock weather API call
    return {
      location: args.location,
      temperature: 22,
      unit: args.unit || 'celsius',
      condition: 'sunny'
    };
  }

  async getTime(args: { timezone?: string }) {
    const timezone = args.timezone || 'UTC';
    return {
      time: new Date().toLocaleString('en-US', { timeZone: timezone }),
      timezone
    };
  }

  async calculate(args: { expression: string }) {
    try {
      // Safe evaluation of mathematical expressions
      const result = eval(args.expression);
      return { result, expression: args.expression };
    } catch (error) {
      return { error: 'Invalid expression' };
    }
  }
}
```

### RAG (Retrieval-Augmented Generation)
```javascript
// RAG implementation with vector search
import { PineconeClient } from '@pinecone-database/pinecone';

class RAGService {
  private openaiService: OpenAIService;
  private pinecone: PineconeClient;
  private index: any;

  constructor(openaiApiKey: string, pineconeApiKey: string) {
    this.openaiService = new OpenAIService(openaiApiKey);
    this.pinecone = new PineconeClient();
    this.initializePinecone(pineconeApiKey);
  }

  async initializePinecone(apiKey: string) {
    await this.pinecone.init({
      apiKey,
      environment: 'us-west1-gcp'
    });
    this.index = this.pinecone.Index('knowledge-base');
  }

  async addDocument(document: { id: string; content: string; metadata?: any }) {
    try {
      // Generate embeddings for the document
      const embeddings = await this.openaiService.generateEmbeddings(document.content);
      
      // Store in Pinecone
      await this.index.upsert({
        vectors: [{
          id: document.id,
          values: embeddings,
          metadata: {
            content: document.content,
            ...document.metadata
          }
        }]
      });

      console.log(`Document ${document.id} added to knowledge base`);
    } catch (error) {
      console.error('Error adding document:', error);
      throw error;
    }
  }

  async searchSimilarDocuments(query: string, topK: number = 5) {
    try {
      // Generate embeddings for the query
      const queryEmbeddings = await this.openaiService.generateEmbeddings(query);
      
      // Search in Pinecone
      const searchResponse = await this.index.query({
        vector: queryEmbeddings,
        topK,
        includeMetadata: true
      });

      return searchResponse.matches?.map(match => ({
        id: match.id,
        score: match.score,
        content: match.metadata?.content,
        metadata: match.metadata
      })) || [];
    } catch (error) {
      console.error('Error searching documents:', error);
      throw error;
    }
  }

  async generateRAGResponse(
    query: string,
    contextDocuments: string[],
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    } = {}
  ) {
    const context = contextDocuments.join('\n\n');
    
    const prompt = `Based on the following context, answer the user's question. If the answer cannot be found in the context, say so.

Context:
${context}

Question: ${query}

Answer:`;

    return await this.openaiService.generateResponse(
      [{ role: 'user', content: prompt }],
      options
    );
  }

  async queryWithRAG(
    question: string,
    topK: number = 5,
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    } = {}
  ) {
    try {
      // Search for relevant documents
      const similarDocs = await this.searchSimilarDocuments(question, topK);
      
      // Extract content from documents
      const contextDocuments = similarDocs.map(doc => doc.content);
      
      // Generate response using RAG
      const response = await this.generateRAGResponse(
        question,
        contextDocuments,
        options
      );

      return {
        answer: response,
        sources: similarDocs.map(doc => ({
          id: doc.id,
          score: doc.score,
          metadata: doc.metadata
        }))
      };
    } catch (error) {
      console.error('RAG query error:', error);
      throw error;
    }
  }
}
```

### Prompt Engineering
```javascript
// Advanced prompt engineering patterns
class PromptEngineer {
  private templates: Map<string, string> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  initializeTemplates() {
    this.templates.set('code_review', `
You are an expert code reviewer. Review the following code and provide feedback on:

1. Code quality and best practices
2. Potential bugs or issues
3. Performance considerations
4. Security concerns
5. Suggestions for improvement

Code to review:
{code}

Language: {language}
Context: {context}

Please provide a detailed review:
`);

    this.templates.set('documentation_generator', `
You are a technical writer. Generate comprehensive documentation for the following code:

Code:
{code}

Requirements:
- Include function/class descriptions
- Document parameters and return values
- Provide usage examples
- Include any important notes or warnings

Generate the documentation:
`);

    this.templates.set('test_generator', `
You are a QA engineer. Generate comprehensive tests for the following code:

Code:
{code}

Requirements:
- Generate unit tests
- Include edge cases
- Test error conditions
- Use {testing_framework}

Generate the tests:
`);

    this.templates.set('refactor_suggestions', `
You are a senior developer. Analyze the following code and suggest refactoring improvements:

Code:
{code}

Focus on:
- Code organization and structure
- Design patterns
- Performance optimization
- Maintainability
- Readability

Provide refactoring suggestions:
`);
  }

  createPrompt(templateName: string, variables: Record<string, string>): string {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    let prompt = template;
    for (const [key, value] of Object.entries(variables)) {
      prompt = prompt.replace(new RegExp(`{${key}}`, 'g'), value);
    }

    return prompt;
  }

  createChainOfThoughtPrompt(question: string): string {
    return `
Let's approach this step by step:

Question: ${question}

To answer this question, let's think through it step by step:

1. First, let's understand what we're being asked...
2. Next, let's consider the relevant information...
3. Then, let's analyze the options...
4. Finally, let's arrive at our conclusion...

Answer:
`;
  }

  createFewShotPrompt(examples: Array<{ input: string; output: string }>, query: string): string {
    let prompt = 'Here are some examples:\n\n';
    
    for (const example of examples) {
      prompt += `Input: ${example.input}\nOutput: ${example.output}\n\n`;
    }
    
    prompt += `Input: ${query}\nOutput:`;
    
    return prompt;
  }
}
```

## Integration with Web Applications

### React Hook for LLM
```javascript
// React hook for LLM integration
import { useState, useCallback } from 'react';

interface UseLLMResponse {
  response: string | null;
  loading: boolean;
  error: string | null;
  generateResponse: (prompt: string) => Promise<void>;
  generateStreamingResponse: (prompt: string) => Promise<void>;
}

export const useLLM = (apiKey: string): UseLLMResponse => {
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateResponse = useCallback(async (prompt: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const openaiService = new OpenAIService(apiKey);
      const result = await openaiService.generateResponse([
        { role: 'user', content: prompt }
      ]);
      
      setResponse(result || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  const generateStreamingResponse = useCallback(async (prompt: string) => {
    setLoading(true);
    setError(null);
    setResponse('');
    
    try {
      const openaiService = new OpenAIService(apiKey);
      await openaiService.generateStreamingResponse(
        [{ role: 'user', content: prompt }],
        (chunk: string) => {
          setResponse(prev => (prev || '') + chunk);
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  return {
    response,
    loading,
    error,
    generateResponse,
    generateStreamingResponse
  };
};
```

### Express.js Middleware
```javascript
// Express.js middleware for LLM integration
import express from 'express';
import rateLimit from 'express-rate-limit';

const app = express();

// Rate limiting for LLM API calls
const llmLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many LLM requests from this IP'
});

// LLM API routes
app.post('/api/llm/generate', llmLimiter, async (req, res) => {
  try {
    const { prompt, model, maxTokens, temperature } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const openaiService = new OpenAIService(process.env.OPENAI_API_KEY);
    const response = await openaiService.generateResponse(
      [{ role: 'user', content: prompt }],
      { model, maxTokens, temperature }
    );

    res.json({ response });
  } catch (error) {
    console.error('LLM API Error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

app.post('/api/llm/stream', llmLimiter, async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    const openaiService = new OpenAIService(process.env.OPENAI_API_KEY);
    await openaiService.generateStreamingResponse(
      [{ role: 'user', content: prompt }],
      (chunk: string) => {
        res.write(chunk);
      }
    );

    res.end();
  } catch (error) {
    console.error('LLM Streaming Error:', error);
    res.status(500).json({ error: 'Failed to generate streaming response' });
  }
});

app.post('/api/llm/rag', llmLimiter, async (req, res) => {
  try {
    const { question, topK } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const ragService = new RAGService(
      process.env.OPENAI_API_KEY,
      process.env.PINECONE_API_KEY
    );

    const result = await ragService.queryWithRAG(question, topK);
    res.json(result);
  } catch (error) {
    console.error('RAG API Error:', error);
    res.status(500).json({ error: 'Failed to process RAG query' });
  }
});
```

## Best Practices

### Security
- Secure API key storage using environment variables
- Implement rate limiting to prevent abuse
- Validate and sanitize user inputs
- Use HTTPS for all API communications

### Performance
- Implement caching for repeated queries
- Use streaming for long responses
- Optimize prompt length and complexity
- Monitor API usage and costs

### Error Handling
- Implement retry logic with exponential backoff
- Handle API rate limits gracefully
- Provide meaningful error messages
- Log errors for debugging

### Cost Optimization
- Monitor token usage
- Implement response caching
- Use appropriate models for different tasks
- Set reasonable limits on response length 