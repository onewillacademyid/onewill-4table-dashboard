/**
 * FourTableGrid Component
 * Strictly enforces:
 * 1. Desktop 2×2 four-table matrix layout (2 columns on large screens)
 * 2. Mobile stacked single-column layout
 * 3. Exact four-section sequence:
 *    (1) Achievements -> (2) Issues -> (3) Next Objectives -> (4) Support Needed
 */

import React from 'react';
import { WeeklyReportSections } from '../types';
import { AchievementsSection } from './editor/AchievementsSection';
import { IssuesSection } from './editor/IssuesSection';
import { ObjectivesSection } from './editor/ObjectivesSection';
import { SupportSection } from './editor/SupportSection';

interface FourTableGridProps {
  sections: WeeklyReportSections;
  onChange: (updatedSections: WeeklyReportSections) => void;
  readOnly?: boolean;
}

export const FourTableGrid: React.FC<FourTableGridProps> = ({
  sections,
  onChange,
  readOnly = false,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full items-stretch">
      {/* Top-Left (Desktop): Section 1 - Achievements */}
      <div className="min-h-[380px] flex flex-col">
        <AchievementsSection
          data={sections.achievements}
          onChange={(achievements) => onChange({ ...sections, achievements })}
          readOnly={readOnly}
        />
      </div>

      {/* Top-Right (Desktop): Section 2 - Issues */}
      <div className="min-h-[380px] flex flex-col">
        <IssuesSection
          data={sections.issues}
          onChange={(issues) => onChange({ ...sections, issues })}
          readOnly={readOnly}
        />
      </div>

      {/* Bottom-Left (Desktop): Section 3 - Next Objectives */}
      <div className="min-h-[380px] flex flex-col">
        <ObjectivesSection
          data={sections.objectives}
          onChange={(objectives) => onChange({ ...sections, objectives })}
          readOnly={readOnly}
        />
      </div>

      {/* Bottom-Right (Desktop): Section 4 - Support Needed */}
      <div className="min-h-[380px] flex flex-col">
        <SupportSection
          data={sections.support}
          onChange={(support) => onChange({ ...sections, support })}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
};
