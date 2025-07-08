import React, { useState, useEffect } from 'react';
import APIChatRepository, { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';

function AnalysisStep({ framework, onAnalysisComplete, workflowData, setWorkflowData }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [bulkAnalysisResults, setBulkAnalysisResults] = useState(null);
  const api = new APIChatRepository();

  useEffect(() => {
    loadCurrentProject();
  }, []);

  const loadCurrentProject = async () => {
    try {
      // Get current project ID using the existing system
      const projectId = await api.getCurrentProjectId();
      const ideList = await api.getIDEs();
      
      if (ideList.success && ideList.data) {
        const activeIDE = ideList.data.find(ide => ide.active);
        if (activeIDE) {
          const project = {
            id: projectId,
            name: activeIDE.workspacePath ? activeIDE.workspacePath.split('/').pop() : 'Unknown',
            path: activeIDE.workspacePath || 'Unknown'
          };
          setCurrentProject(project);
        }
      }
    } catch (error) {
      setAnalysisError('Failed to load current project: ' + error.message);
    }
  };

  const startAnalysis = async () => {
    if (!currentProject) {
      setAnalysisError('No project selected');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    
    try {
      // Use new documentation-specific analysis API
      console.log('📊 [AnalysisStep] Starting documentation analysis for project:', currentProject.id);
      console.log('📊 [AnalysisStep] Project path:', currentProject.path);
      
      const response = await apiCall(`/api/projects/${currentProject.id}/documentation/analyze`, {
        method: 'POST',
        body: JSON.stringify({
          projectPath: currentProject.path
        })
      });

              if (response.success) {
          console.log('✅ [AnalysisStep] Documentation analysis completed:', response.data);
          console.log('✅ [AnalysisStep] Created tasks:', response.data.createdTasks);
          
          // Parse analysis results for documentation framework
          const results = parseAnalysisResults(response.data);
          setAnalysisResults(results);
          
          // Update workflow data with created tasks
          setWorkflowData(prev => ({
            ...prev,
            projectId: currentProject.id,
            projectName: currentProject.name,
            projectPath: currentProject.path,
            analysisComplete: true,
            createdTasks: response.data.createdTasks || [],
            taskCount: response.data.createdTasks?.length || 0
          }));
          
          // Notify parent component
          onAnalysisComplete(results);
        } else {
          throw new Error(response.error || 'Documentation analysis failed');
        }
    } catch (error) {
      console.error('❌ [AnalysisStep] Documentation analysis error:', error);
      setAnalysisError('Error during analysis: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeAllProjects = async () => {
    setIsAnalyzingAll(true);
    setAnalysisError(null);
    setBulkAnalysisResults(null);
    
    try {
      console.log('🚀 [AnalysisStep] Starting bulk documentation analysis for all projects');
      
      const response = await apiCall('/api/projects/analyze-all/documentation', {
        method: 'POST'
      });

      if (response.success) {
        console.log('✅ [AnalysisStep] Bulk documentation analysis completed:', response.data);
        
        setBulkAnalysisResults(response.data);
        
        // Show results summary
        const { totalIDEs, successfulAnalyses, failedAnalyses, totalTasksCreated } = response.data;
        
        // Update workflow data with bulk results
        setWorkflowData(prev => ({
          ...prev,
          bulkAnalysisComplete: true,
          bulkResults: {
            totalProjects: totalIDEs,
            successful: successfulAnalyses,
            failed: failedAnalyses,
            totalTasks: totalTasksCreated
          }
        }));
        
        // Create a summary for the analysis results
        const summaryResults = {
          overallCoverage: 85, // Can be calculated from bulk results
          areas: [
            { name: 'All Projects Analyzed', coverage: Math.round((successfulAnalyses / totalIDEs) * 100), quality: 'Excellent', missing: [] }
          ],
          prioritizedTasks: [
            {
              title: `Bulk Analysis Complete: ${successfulAnalyses}/${totalIDEs} projects analyzed`,
              priority: 'High',
              estimatedHours: totalTasksCreated,
              category: 'bulk-analysis',
              description: `Successfully analyzed ${successfulAnalyses} projects and created ${totalTasksCreated} total tasks`
            }
          ],
          qualityScore: Math.round((successfulAnalyses / totalIDEs) * 100),
          recommendations: [
            `${successfulAnalyses} projects analyzed successfully`,
            `${totalTasksCreated} documentation tasks created across all projects`,
            'Check each IDE for project-specific task execution',
            failedAnalyses > 0 ? `${failedAnalyses} projects failed analysis - check individual project requirements` : 'All projects analyzed successfully'
          ],
          rawAnalysis: response.data,
          isBulkAnalysis: true
        };
        
        setAnalysisResults(summaryResults);
        onAnalysisComplete(summaryResults);
        
      } else {
        throw new Error(response.error || 'Bulk documentation analysis failed');
      }
    } catch (error) {
      console.error('❌ [AnalysisStep] Bulk documentation analysis error:', error);
      setAnalysisError('Error during bulk analysis: ' + error.message);
    } finally {
      setIsAnalyzingAll(false);
    }
  };

  const parseAnalysisResults = (analysisData) => {
    // Parse real documentation analysis results from DocumentationController
    const analysis = analysisData.analysis || {};
    const coverage = analysis.coverage || {};
    const tasks = analysis.tasks || [];
    
    // Extract coverage areas from the analysis
    const areas = Object.entries(coverage).map(([name, percentage]) => ({
      name,
      coverage: percentage,
      quality: percentage > 80 ? 'Excellent' : percentage > 60 ? 'Good' : 'Poor',
      missing: [] // TODO: Extract from priorities
    }));
    
    // Calculate overall coverage
    const overallCoverage = areas.length > 0 
      ? Math.round(areas.reduce((sum, area) => sum + area.coverage, 0) / areas.length)
      : 0;
    
    // Convert tasks to our format
    const prioritizedTasks = tasks.map(task => ({
      title: task.title,
      priority: task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : 'Medium',
      estimatedHours: task.estimatedTime || 2,
      category: task.type || 'documentation',
      description: task.description
    }));
    
    // Extract recommendations from summary or priorities
    const recommendations = analysis.priorities?.flatMap(p => p.items) || [
      'Review the generated analysis from Cursor IDE',
      'Implement high-priority tasks first',
      'Focus on areas with low coverage'
    ];
    
    return {
      overallCoverage,
      areas: areas.length > 0 ? areas : [
        { name: 'Getting Started', coverage: 70, quality: 'Good', missing: [] },
        { name: 'API Documentation', coverage: 50, quality: 'Fair', missing: [] },
        { name: 'Development Guide', coverage: 60, quality: 'Good', missing: [] }
      ],
      prioritizedTasks: prioritizedTasks.length > 0 ? prioritizedTasks : [
        { 
          title: 'Review Documentation Analysis',
          priority: 'High',
          estimatedHours: 1,
          category: 'review',
          description: 'Review the analysis results from Cursor IDE in the next step'
        }
      ],
      qualityScore: analysis.summary?.avgCoverage || overallCoverage,
      recommendations,
      rawAnalysis: analysisData // Keep original for debugging
    };
  };

  const renderCoverageChart = () => {
    if (!analysisResults) return null;

    return (
      <div className="coverage-chart">
        <h4>Documentation Coverage by Area</h4>
        <div className="coverage-bars">
          {analysisResults.areas.map((area, index) => (
            <div key={index} className="coverage-bar">
              <div className="bar-label">
                <span>{area.name}</span>
                <span>{area.coverage}%</span>
              </div>
              <div className="bar-container">
                <div 
                  className={`bar-fill ${area.coverage > 80 ? 'excellent' : area.coverage > 60 ? 'good' : 'poor'}`}
                  style={{ width: `${area.coverage}%` }}
                />
              </div>
              <div className="bar-details">
                <span className={`quality-badge ${area.quality.toLowerCase()}`}>
                  {area.quality}
                </span>
                <span className="missing-count">
                  {area.missing.length} missing items
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTaskPreview = () => {
    if (!analysisResults) return null;

    return (
      <div className="task-preview">
        <h4>Prioritized Tasks ({analysisResults.prioritizedTasks.length})</h4>
        <div className="task-list">
          {analysisResults.prioritizedTasks.map((task, index) => (
            <div key={index} className="task-preview-item">
              <div className="task-header">
                <span className="task-title">{task.title}</span>
                <span className={`priority-badge ${task.priority.toLowerCase()}`}>
                  {task.priority}
                </span>
              </div>
              <div className="task-meta">
                <span className="estimated-time">⏱️ {task.estimatedHours}h</span>
                <span className="category">📂 {task.category}</span>
              </div>
              <p className="task-description">{task.description}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="analysis-step">
      {!workflowData.analysisComplete ? (
        <div className="analysis-setup">
          <div className="setup-section">
            <h4>📁 Current Project</h4>
            {currentProject ? (
              <div className="current-project-info">
                <div className="project-detail">
                  <strong>Name:</strong> {currentProject.name}
                </div>
                <div className="project-detail">
                  <strong>ID:</strong> {currentProject.id}
                </div>
                <div className="project-detail">
                  <strong>Path:</strong> {currentProject.path}
                </div>
              </div>
            ) : (
              <div className="loading-project">
                <div className="spinner"></div>
                Loading current project...
              </div>
            )}
            <p className="help-text">
              Documentation analysis will be performed for the current project
            </p>
          </div>

          <div className="setup-section">
            <h4>🔍 Analysis Overview</h4>
            <div className="analysis-checklist">
              <div className="checklist-item">
                <span className="check-icon">📊</span>
                <div>
                  <strong>Documentation Coverage</strong>
                  <p>Analyze existing documentation files and assess coverage</p>
                </div>
              </div>
              <div className="checklist-item">
                <span className="check-icon">🔍</span>
                <div>
                  <strong>Gap Analysis</strong>
                  <p>Identify missing documentation areas and quality issues</p>
                </div>
              </div>
              <div className="checklist-item">
                <span className="check-icon">📋</span>
                <div>
                  <strong>Task Prioritization</strong>
                  <p>Create prioritized list of improvement tasks</p>
                </div>
              </div>
              <div className="checklist-item">
                <span className="check-icon">📈</span>
                <div>
                  <strong>Quality Assessment</strong>
                  <p>Evaluate documentation quality and provide recommendations</p>
                </div>
              </div>
            </div>
          </div>

          <div className="action-section">
            <button 
              className="btn-primary analysis-btn"
              onClick={startAnalysis}
              disabled={isAnalyzing || isAnalyzingAll || !currentProject}
            >
              {isAnalyzing ? (
                <>
                  <div className="spinner"></div>
                  Analyzing Documentation...
                </>
              ) : (
                <>
                  🔍 Start Documentation Analysis
                </>
              )}
            </button>
            
            <button 
              className="btn-secondary analysis-btn analyze-all-btn"
              onClick={analyzeAllProjects}
              disabled={isAnalyzing || isAnalyzingAll}
              title="Analyze documentation for ALL open projects simultaneously"
            >
              {isAnalyzingAll ? (
                <>
                  <div className="spinner"></div>
                  Analyzing All Projects...
                </>
              ) : (
                <>
                  🚀 Analyze ALL Projects
                </>
              )}
            </button>
            
            {analysisError && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {analysisError}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="analysis-results">
          <div className="results-header">
            <h3>📊 Analysis Complete</h3>
            <div className="overall-score">
              <span className="score-label">Overall Quality Score:</span>
              <span className={`score-value ${analysisResults.qualityScore > 80 ? 'excellent' : analysisResults.qualityScore > 60 ? 'good' : 'poor'}`}>
                {analysisResults.qualityScore}%
              </span>
            </div>
          </div>

          {(workflowData.taskCount > 0 || workflowData.bulkResults) && (
            <div className="task-creation-success">
              <div className="success-icon">✅</div>
              <div className="success-content">
                {workflowData.bulkResults ? (
                  <>
                    <h4>Bulk Analysis Complete</h4>
                    <p>
                      Successfully analyzed <strong>{workflowData.bulkResults.successful}/{workflowData.bulkResults.totalProjects} projects</strong> and created <strong>{workflowData.bulkResults.totalTasks} total tasks</strong> across all projects.
                    </p>
                    <div className="success-details">
                      <span className="detail-item">🏗️ {workflowData.bulkResults.totalProjects} projects scanned</span>
                      <span className="detail-item">✅ {workflowData.bulkResults.successful} successful analyses</span>
                      <span className="detail-item">📋 {workflowData.bulkResults.totalTasks} total tasks created</span>
                      <span className="detail-item">🚀 All tasks sent to respective IDEs</span>
                      {workflowData.bulkResults.failed > 0 && (
                        <span className="detail-item">⚠️ {workflowData.bulkResults.failed} failed analyses</span>
                      )}
                    </div>
                    <div className="execution-info">
                      <div className="execution-status">
                        <span className="status-icon">🌟</span>
                        <strong>Multi-Project Execution Started</strong>
                      </div>
                      <p className="execution-details">
                        All project IDEs are now executing their documentation tasks automatically. 
                        Check each IDE for project-specific progress and Git commits.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <h4>Tasks Created & Sent to IDE</h4>
                    <p>
                      Successfully created <strong>{workflowData.taskCount} tasks</strong> from the documentation analysis.
                      These tasks have been automatically sent to Cursor IDE for execution.
                    </p>
                    <div className="success-details">
                      <span className="detail-item">📋 {workflowData.taskCount} tasks created</span>
                      <span className="detail-item">🗃️ Saved to database</span>
                      <span className="detail-item">🚀 Sent to Cursor IDE</span>
                      <span className="detail-item">🤖 AI will execute tasks</span>
                    </div>
                    
                    {analysisResults?.rawAnalysis?.executionTriggered && (
                      <div className="execution-info">
                        <div className="execution-status">
                          <span className="status-icon">🎯</span>
                          <strong>Auto-Execution Started</strong>
                        </div>
                        <p className="execution-details">
                          Cursor IDE is now executing the documentation tasks automatically. 
                          Check your IDE for progress updates and Git commits.
                          {analysisResults?.rawAnalysis?.executionResult?.idePort && (
                            <>
                              <br />
                              <strong>IDE Port:</strong> {analysisResults.rawAnalysis.executionResult.idePort}
                            </>
                          )}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {renderCoverageChart()}
          {renderTaskPreview()}

          <div className="recommendations">
            <h4>💡 Key Recommendations</h4>
            <ul>
              {analysisResults.recommendations.map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnalysisStep; 