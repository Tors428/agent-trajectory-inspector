import { useState, useEffect } from 'react';
import './App.css';
import trajectories from './trajectories.json';

function getIcon(type) {
  if (type === 'thought') return '💭';
  if (type === 'tool_call') return '🔧';
  if (type === 'observation') return '👁';
  if (type === 'action') return '🖱';
  return '❓';
}

function StepDetail({ step }) {
  if (step.type === 'thought') {
    return (
      <div>
        <h4>💭 Thought</h4>
        <p style={{ fontStyle: 'italic' }}>{step.content.reasoning}</p>
      </div>
    );
  }

  if (step.type === 'tool_call') {
    return (
      <div>
        <h4>🔧 Tool Call: {step.content.tool}</h4>
        <p>Arguments:</p>
        <pre style={{ background: '#f4f4f4', padding: '10px' }}>
          {JSON.stringify(step.content.arguments, null, 2)}
        </pre>
      </div>
    );
  }

  if (step.type === 'observation') {
    return (
      <div>
        <h4>👁 Observation</h4>
        <p>{step.content.result}</p>
        <details>
          <summary>Raw data</summary>
          <pre style={{ background: '#f4f4f4', padding: '10px' }}>
            {step.content.raw}
          </pre>
        </details>
      </div>
    );
  }

  if (step.type === 'action') {
    return (
      <div>
        <h4>🖱 Action: {step.content.actionType}</h4>
        <p>
          <strong>Target:</strong> {step.content.target}
        </p>
        <p>{step.content.description}</p>
      </div>
    );
  }

  return <p>Unknown step type.</p>;
}

const STORAGE_KEY = 'trajectory-inspector-annotations';

function loadAnnotations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function App() {
  const [selectedTrajectoryId, setSelectedTrajectoryId] = useState(
    trajectories[0].id
  );
  const [selectedStepId, setSelectedStepId] = useState(null);
  const [annotations, setAnnotations] = useState(loadAnnotations);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(annotations));
  }, [annotations]);

  const trajectory = trajectories.find((t) => t.id === selectedTrajectoryId);
  const selectedStep = trajectory.steps.find((s) => s.id === selectedStepId);

  const annotationKey = (trajId, stepId) => `${trajId}::${stepId}`;

  const getAnnotation = (stepId) =>
    annotations[annotationKey(selectedTrajectoryId, stepId)] || {
      note: '',
      isFailure: false,
    };

  const updateAnnotation = (stepId, changes) => {
    const key = annotationKey(selectedTrajectoryId, stepId);
    setAnnotations((prev) => ({
      ...prev,
      [key]: { ...getAnnotation(stepId), ...changes },
    }));
  };

  return (
    <div className="app">
      <div className="app-header">
        <h1>Agent Trajectory Inspector</h1>
        <select
          className="trajectory-picker"
          value={selectedTrajectoryId}
          onChange={(e) => {
            setSelectedTrajectoryId(e.target.value);
            setSelectedStepId(null);
          }}
        >
          {trajectories.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title} ({t.status})
            </option>
          ))}
        </select>
      </div>

      <h2>{trajectory.title}</h2>
      <p className="goal">Goal: {trajectory.goal}</p>

      <div className="layout">
        <div className="timeline">
          <h3>Timeline</h3>
          <ul>
            {trajectory.steps.map((step) => {
              const ann = getAnnotation(step.id);
              const classes = [
                selectedStepId === step.id ? 'selected' : '',
                ann.isFailure ? 'failure' : '',
              ]
                .join(' ')
                .trim();

              return (
                <li
                  key={step.id}
                  className={classes}
                  onClick={() => setSelectedStepId(step.id)}
                >
                  <span>{getIcon(step.type)}</span>
                  <span className="step-summary">{step.summary}</span>
                  <span className="step-badges">
                    {ann.note && <span title="Has notes">📝</span>}
                    {ann.isFailure && <span title="Failure point">🚩</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="detail">
          <h3>Detail</h3>
          {selectedStep ? (
            <>
              <StepDetail step={selectedStep} />

              <div className="annotation">
                <h4>📝 Notes</h4>
                <textarea
                  value={getAnnotation(selectedStep.id).note}
                  onChange={(e) =>
                    updateAnnotation(selectedStep.id, { note: e.target.value })
                  }
                  placeholder="Why did this step go wrong? What should it have done?"
                />
                <label className="failure-toggle">
                  <input
                    type="checkbox"
                    checked={getAnnotation(selectedStep.id).isFailure}
                    onChange={(e) =>
                      updateAnnotation(selectedStep.id, {
                        isFailure: e.target.checked,
                      })
                    }
                  />
                  🚩 Flag this as the failure point
                </label>
              </div>
            </>
          ) : (
            <p className="placeholder">
              Click a step on the left to see its details.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
