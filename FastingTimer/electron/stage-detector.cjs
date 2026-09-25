// electron/stage-detector.cjs
// 5 Biological Stages Math Engine & Notification Dedup

const STAGES = [
  {
    stage: 'anabolic',
    name: 'Digestion / Anabolic',
    description: 'ระดับน้ำตาลและอินซูลินเริ่มลดลง ร่างกายดูดซึมสารอาหารจากมื้อล่าสุด',
    color: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.4)',
    flameColor: '#38bdf8',
    icon: '🔵',
    hoursMin: 0,
    hoursMax: 4
  },
  {
    stage: 'catabolic',
    name: 'Fat Burning Zone',
    description: 'ไกลโคเจนในตับหมดลง ร่างกายสลับมาเผาผลาญไขมันสะสมเป็นพลังงานหลัก',
    color: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    flameColor: '#10b981',
    icon: '🟢',
    hoursMin: 4,
    hoursMax: 12
  },
  {
    stage: 'ketosis',
    name: 'Ketosis Metabolic Switch',
    description: 'ตับสังเคราะห์คีโตนเต็มกำลัง สมองใช้คีโตนเป็นพลังงานสะอาด ลดการอักเสบในเซลล์',
    color: '#8b5cf6',
    glowColor: 'rgba(139, 92, 246, 0.4)',
    flameColor: '#a855f7',
    icon: '🟣',
    hoursMin: 12,
    hoursMax: 16
  },
  {
    stage: 'autophagy',
    name: 'Autophagy Peak (16:8 Target)',
    description: 'ยินดีด้วยบอส! ร่างกายเริ่มกลืนกินเซลล์ขยะและรีไซเคิลโปรตีนที่เสื่อมสภาพ',
    color: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.5)',
    flameColor: '#f59e0b',
    icon: '🟡',
    hoursMin: 16,
    hoursMax: 24
  },
  {
    stage: 'renewal',
    name: 'Deep Cellular Renewal',
    description: 'สเต็มเซลล์เริ่มทำงาน รีเซ็ตระบบภูมิคุ้มกันระดับลึก รักษาเกลือแร่และความชุ่มชื้น',
    color: '#f43f5e',
    glowColor: 'rgba(244, 63, 94, 0.5)',
    flameColor: '#f43f5e',
    icon: '⚪',
    hoursMin: 24,
    hoursMax: 72
  }
];

class StageDetector {
  constructor(notifier) {
    this.notifier = notifier;
    this.notifiedStages = new Set();
    this.activeSessionId = null;
  }

  getStage(elapsedSeconds) {
    const hours = elapsedSeconds / 3600;
    if (hours < 4) return STAGES[0];
    if (hours < 12) return STAGES[1];
    if (hours < 16) return STAGES[2];
    if (hours < 24) return STAGES[3];
    return STAGES[4];
  }

  evaluate(session, elapsedSeconds, onStageAction) {
    if (!session || session.status !== 'active') {
      this.notifiedStages.clear();
      return this.getStage(0);
    }

    // Reset dedup set if new session started
    if (this.activeSessionId !== session.id) {
      this.activeSessionId = session.id;
      this.notifiedStages.clear();
    }

    const currentStage = this.getStage(elapsedSeconds);
    const hours = elapsedSeconds / 3600;

    // Check milestones and trigger notification once per milestone
    if (hours >= 4 && !this.notifiedStages.has('catabolic')) {
      this.notifiedStages.add('catabolic');
      if (this.notifier) this.notifier.notifyStageTransition(STAGES[1], hours, onStageAction);
    }
    if (hours >= 12 && !this.notifiedStages.has('ketosis')) {
      this.notifiedStages.add('ketosis');
      if (this.notifier) this.notifier.notifyStageTransition(STAGES[2], hours, onStageAction);
    }
    if (hours >= 16 && !this.notifiedStages.has('autophagy')) {
      this.notifiedStages.add('autophagy');
      if (this.notifier) this.notifier.notifyStageTransition(STAGES[3], hours, onStageAction);
    }
    if (hours >= 24 && !this.notifiedStages.has('renewal')) {
      this.notifiedStages.add('renewal');
      if (this.notifier) this.notifier.notifyStageTransition(STAGES[4], hours, onStageAction);
    }

    return currentStage;
  }
}

module.exports = { StageDetector, STAGES };
