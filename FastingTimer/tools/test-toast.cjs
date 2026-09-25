// tools/test-toast.cjs
// Fire a standalone Native Windows Action Center Toast Notification test via Electron
const { app, Notification } = require('electron');

app.setAppUserModelId('com.doctorbank.fasting');

app.whenReady().then(() => {
  console.log('📢 Firing Native Windows Toast Notification to Action Center...');

  const notification = new Notification({
    title: '🍳 Fasting & Kitchen Sentinel: ทดสอบระบบแจ้งเตือน Windows แท้!',
    body: 'ยินดีด้วยบอส! ระบบ Windows WinRT Action Center Toast Notification ทำงานสมบูรณ์แบบ 100%',
    urgency: 'critical',
    sound: 'Alarm01',
    actions: [
      { type: 'button', text: '✅ ผ่านการทดสอบ' },
      { type: 'button', text: '⏱️ เพิ่มอีก 2 นาที' }
    ]
  });

  notification.on('action', (event, index) => {
    console.log(`  👉 User clicked action button ${index}!`);
  });

  notification.show();
  console.log('✅ Notification displayed in Windows Action Center. Auto-closing test in 4 seconds...');

  setTimeout(() => {
    app.quit();
  }, 4000);
});
