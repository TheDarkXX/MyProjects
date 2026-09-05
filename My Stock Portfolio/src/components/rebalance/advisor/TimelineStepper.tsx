import React from 'react';

interface ActionRoadmapItem {
  phase: string;
  action: string;
}

interface TimelineStepperProps {
  roadmap: ActionRoadmapItem[];
}

export const TimelineStepper: React.FC<TimelineStepperProps> = ({ roadmap }) => {
  if (!roadmap || roadmap.length === 0) return null;

  return (
    <div className="bg-[#12141F] border border-[#232738] rounded-xl p-4 md:p-6">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-lg">🗺️</span>
        <div>
          <h4 className="text-white font-bold text-sm">
            แผนปฏิบัติการรายระยะ (Strategic Action Roadmap)
          </h4>
          <p className="text-[13px] text-slate-300 mt-0.5">
            ลำดับขั้นตอนการปรับพอร์ตอย่างเป็นระบบเพื่อไม่ให้กระทบต้นทุนและจังหวะตลาด
          </p>
        </div>
      </div>

      <div className="relative">
        {/* Desktop Connecting Line */}
        <div className="hidden md:block absolute top-6 left-8 right-8 h-0.5 bg-gradient-to-r from-purple-500 via-sky-500 to-emerald-500 opacity-40 z-0" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          {roadmap.map((step, idx) => {
            const stepNumber = idx + 1;
            const isFirst = idx === 0;
            const isLast = idx === roadmap.length - 1;

            let stepColor = 'from-purple-500 to-indigo-600 border-purple-400 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.4)]';
            let badgeText = 'REDUCTION & TRIM';
            if (stepNumber === 2) {
              stepColor = 'from-sky-500 to-blue-600 border-sky-400 text-sky-200 shadow-[0_0_15px_rgba(56,189,248,0.4)]';
              badgeText = 'ACCUMULATION';
            } else if (stepNumber === 3) {
              stepColor = 'from-emerald-500 to-teal-600 border-emerald-400 text-emerald-200 shadow-[0_0_15px_rgba(52,211,153,0.4)]';
              badgeText = 'BUFFER & MONITOR';
            }

            return (
              <div
                key={idx}
                className="bg-[#181B2A] border border-[#2A2E45] rounded-xl p-4 flex flex-col justify-between hover:border-purple-500/40 transition-all duration-300 shadow-md group"
              >
                <div>
                  {/* Step Header */}
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${stepColor} border-2 flex items-center justify-center font-black text-sm text-white shrink-0`}>
                        {stepNumber}
                      </div>
                      <h5 className="font-bold text-white text-[14px] leading-tight">
                        {step.phase}
                      </h5>
                    </div>
                  </div>

                  {/* Step Body */}
                  <div className="pt-2 border-t border-[#232738]/80">
                    <p className="text-[13px] text-slate-200 leading-relaxed font-normal">
                      {step.action}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-2 flex items-center justify-between text-xs text-slate-400 font-semibold">
                  <span>ขั้นตอนที่ {stepNumber}/{roadmap.length}</span>
                  <span className="text-purple-400 font-bold">{badgeText}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
