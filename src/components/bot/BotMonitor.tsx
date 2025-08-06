// Bot Monitor Component - Shows real-time bot activity
import React, { useState, useEffect } from 'react';
import { getBotCommands, getBotExecutions, toggleBotCommand } from '../../services/botExecutionService';
import type { BotCommand, BotExecution } from '../../services/botExecutionService';

const BotMonitor: React.FC = () => {
  const [commands, setCommands] = useState<BotCommand[]>([]);
  const [executions, setExecutions] = useState<BotExecution[]>([]);
  const [activeTab, setActiveTab] = useState<'commands' | 'activity'>('commands');

  useEffect(() => {
    // Update data every 2 seconds
    const interval = setInterval(() => {
      setCommands(getBotCommands());
      setExecutions(getBotExecutions());
    }, 2000);

    // Initial load
    setCommands(getBotCommands());
    setExecutions(getBotExecutions());

    return () => clearInterval(interval);
  }, []);

  const handleToggleCommand = (commandId: string) => {
    toggleBotCommand(commandId);
    setCommands(getBotCommands());
  };

  const formatCondition = (condition: any) => {
    switch (condition.type) {
      case 'karma_less_than':
        return `Karma < ${condition.value}`;
      case 'karma_greater_than':
        return `Karma > ${condition.value}`;
      case 'content_contains':
        return `${condition.field || 'title'} contains "${condition.value}"`;
      case 'user_age_less_than':
        return `Account age < ${condition.value} days`;
      case 'post_score_less_than':
        return `Score < ${condition.value}`;
      default:
        return condition.type;
    }
  };

  const formatAction = (action: any) => {
    switch (action.type) {
      case 'delete_post':
        return '🗑️ Delete Post';
      case 'send_message':
        return '📨 Send Message';
      case 'ban_user':
        return '🔨 Ban User';
      case 'assign_flair':
        return '🏷️ Assign Flair';
      case 'lock_post':
        return '🔒 Lock Post';
      default:
        return action.type;
    }
  };

  return (
    <div className="bot-monitor">
      <div className="bot-monitor-header">
        <h3>🤖 Bot System Monitor</h3>
        <div className="bot-status">
          <span className="status-indicator active"></span>
          Bot System Active
        </div>
      </div>

      <div className="bot-tabs">
        <button
          className={`bot-tab ${activeTab === 'commands' ? 'active' : ''}`}
          onClick={() => setActiveTab('commands')}
        >
          Commands ({commands.length})
        </button>
        <button
          className={`bot-tab ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          Recent Activity ({executions.length})
        </button>
      </div>

      {activeTab === 'commands' && (
        <div className="bot-commands">
          {commands.length === 0 ? (
            <div className="empty-state">
              <p>No bot commands configured</p>
            </div>
          ) : (
            commands.map(command => (
              <div key={command.id} className={`bot-command ${command.isActive ? 'active' : 'inactive'}`}>
                <div className="command-header">
                  <div className="command-info">
                    <h4>{command.name}</h4>
                    <span className="command-trigger">
                      Trigger: {command.trigger.type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="command-controls">
                    <span className="execution-count">
                      Executed: {command.executionCount}x
                    </span>
                    <button
                      onClick={() => handleToggleCommand(command.id)}
                      className={`toggle-btn ${command.isActive ? 'active' : 'inactive'}`}
                    >
                      {command.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>

                <div className="command-details">
                  <div className="conditions">
                    <strong>Conditions:</strong>
                    <ul>
                      {command.trigger.conditions.map((condition, index) => (
                        <li key={index}>{formatCondition(condition)}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="actions">
                    <strong>Actions:</strong>
                    <ul>
                      {command.actions.map((action, index) => (
                        <li key={index}>
                          {formatAction(action)}
                          {action.reason && <span className="action-reason"> - {action.reason}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="bot-activity">
          {executions.length === 0 ? (
            <div className="empty-state">
              <p>No bot activity yet</p>
            </div>
          ) : (
            <div className="activity-list">
              {executions.slice().reverse().slice(0, 20).map(execution => (
                <div key={execution.id} className={`activity-item ${execution.result}`}>
                  <div className="activity-icon">
                    {execution.result === 'success' ? '✅' : 
                     execution.result === 'failed' ? '❌' : '⏭️'}
                  </div>
                  <div className="activity-details">
                    <div className="activity-action">
                      {formatAction({ type: execution.action })}
                      <span className="activity-target">on {execution.targetType} {execution.targetId.slice(0, 8)}...</span>
                    </div>
                    <div className="activity-meta">
                      <span className="activity-time">
                        {execution.executedAt.toLocaleTimeString()}
                      </span>
                      {execution.reason && (
                        <span className="activity-reason">- {execution.reason}</span>
                      )}
                    </div>
                  </div>
                  <div className="activity-status">
                    {execution.result}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BotMonitor;
