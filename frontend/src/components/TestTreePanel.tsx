import {
  ChevronDown,
  ChevronRight,
  Play,
} from "lucide-react";

import type {
  ProjectManifest,
} from "../types/api-project";

import type {
  ExecutionSelection,
} from "../types/execution";

import {
  useState,
} from "react";

type Props = {
  project: ProjectManifest;
  onSelectTest: (selection: ExecutionSelection) => void;
};

export function TestTreePanel({ project, onSelectTest }: Props) {
  const [expandedContainers, setExpandedContainers] = useState<string[]>([]);

  function toggleContainer(containerId: string) {
    setExpandedContainers((prev) =>
      prev.includes(containerId)
        ? prev.filter((id) => id !== containerId)
        : [...prev, containerId]
    );
  }

  if (project.testCatalog.containers.length === 0) {
    return (
      <div className="p-4 text-[12.5px] text-[var(--text-quaternary)]">
        No tests found
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {project.testCatalog.containers.map((container) => {
        const isExpanded = expandedContainers.includes(container.id);

        return (
          <div key={container.id} className="space-y-1">
            <div className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--fill-quinary)] rounded-lg transition">
              <button
                type="button"
                onClick={() => toggleContainer(container.id)}
                className="p-0 hover:bg-[var(--fill-tertiary)] rounded transition"
              >
                {isExpanded ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </button>

              <span className="text-[12.5px] font-medium flex-1 truncate">
                {container.name}
              </span>

              <span className="text-[11px] text-[var(--text-quaternary)] bg-[var(--fill-tertiary)] px-2 py-0.5 rounded-full">
                {container.tests.length}
              </span>

              <button
                type="button"
                onClick={() => onSelectTest({ type: "CONTAINER", containerId: container.id })}
                className="p-1.5 rounded-lg hover:bg-[#0a84ff] transition text-[var(--text-quaternary)] hover:text-white"
                title="Run all tests in this feature"
              >
                <Play size={14} />
              </button>
            </div>

            {isExpanded && (
              <div className="ml-6 space-y-1 border-l border-[var(--hairline)] pl-3">
                {container.tests.map((test) => (
                  <div
                    key={test.id}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--fill-quinary)] rounded-lg transition"
                  >
                    <div className="w-4" />
                    <span className="text-[12px] flex-1 truncate">
                      {test.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectTest({ type: "TESTS", testIds: [test.id] })}
                      className="p-1.5 rounded-lg hover:bg-[#0a84ff] transition text-[var(--text-quaternary)] hover:text-white"
                      title="Run this scenario"
                    >
                      <Play size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
