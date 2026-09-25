// electron/toast-notifier.cjs
// Native Windows 10/11 WinRT Action Center Toast Notifier with Interactive Action Buttons
const { Notification, app } = require('electron');
const path = require('path');

class ToastNotifier {
  constructor(options = {}) {
    this.appId = options.appId || 'com.doctorbank.fasting';
    if (process.platform === 'win32') {
      try {
        app.setAppUserModelId(this.appId);
      } catch (e) {}
    }
  }

  // แจ้งเตือนเมื่อต้มไข่ / ตัวจับเวลาสั้นครบเวลา
  notifyKitchenTimerDone(timerName, durationMinutes, onAddTwoMinutes) {
    if (!Notification.isSupported()) return;

    const notification = new Notification({
      title: `🍳 ${timerName || 'ตัวจับเวลา'} เสร็จแล้วบอส!`,
      body: `จับเวลาครบ ${durationMinutes} เรียบร้อยแล้ว อย่าลืมปิดเตา/ยกขึ้นมาแช่น้ำเย็น!`,
      urgency: 'critical',
      sound: 'Alarm01',
      actions: [
        { type: 'button', text: '✅ เรียบร้อย' },
        { type: 'button', text: '⏱️ แถมอีก 2 นาที' }
      ]
    });

    notification.on('action', (event, index) => {
      if (index === 1 && typeof onAddTwoMinutes === 'function') {
        onAddTwoMinutes();
      }
    });

    notification.show();
  }

  // แจ้งเตือนเมื่อข้ามสเตจชีววิทยา IF Fasting
  notifyStageTransition(stageInfo, elapsedHours, onAction) {
    if (!Notification.isSupported()) return;

    const notification = new Notification({
      title: `${stageInfo.icon || '🔥'} เข้าสู่ ${stageInfo.name} (${elapsedHours.toFixed(1)} ชม.)`,
      body: stageInfo.description || 'ร่างกายเริ่มกระบวนการสลับเมทาบอลิซึมระดับเซลล์',
      urgency: stageInfo.stage === 'autophagy' ? 'critical' : 'normal',
      sound: stageInfo.stage === 'autophagy' ? 'Reminder' : undefined,
      actions: [
        { type: 'button', text: '📊 ดู Bio-Scan' }
      ]
    });

    notification.on('action', (event, index) => {
      if (typeof onAction === 'function') {
        onAction(stageInfo);
      }
    });

    notification.show();
  }

  // แจ้งเตือนเตือนดื่มน้ำ / อิเล็กโทรไลต์
  notifyHydrationReminder() {
    if (!Notification.isSupported()) return;

    const notification = new Notification({
      title: '💧 จิบน้ำผสมเกลือแร่ (Electrolytes)',
      body: 'การทำ IF ต้องรักษาสมดุลแร่ธาตุ จิบน้ำเปล่าหรือเกลือชมพูเพื่อลดอาการโหย',
      urgency: 'low'
    });

    notification.show();
  }
}

module.exports = ToastNotifier;
