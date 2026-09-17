export interface StockDossierStatic {
  symbol: string;
  name: string;
  category: 'Core' | 'Moonshot';
  shortStory: string;
  businessMoat: string;
  moatChecklist: string[];
  keyDriver: {
    key: string;
    label: string;
    unit: string;
    safeThreshold: number;
    dangerThreshold: number;
    description: string;
  };
  sellingProtocol: {
    stopLossRule: string;
    freeRideRule: string;
    moatBreakerCondition: string;
  };
}

export const DOSSIER_STATIC_DATA: Record<string, StockDossierStatic> = {
  NVDA: {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    category: 'Core',
    shortStory: 'ราชาผู้กุมอำนาจประมวลผล AI ของโลก ด้วยชิป GPU และเครือข่ายความเร็วสูง Blackwell คุมระบบนิเวศซอฟต์แวร์ CUDA ที่นักพัฒนาทั่วโลกติดหล่มเปลี่ยนใจยาก',
    businessMoat: 'CUDA Software Ecosystem Lock-in & Full-Stack AI Factory Monopoly',
    moatChecklist: [
      'Gross Margin ยังคงยืนเหนือระดับ 70% หรือไม่ (ป้องกันสงครามราคา)',
      'สัดส่วนรายได้ Data Center ยังคงเติบโตระดับ Double-Digit QoQ',
      'สัดส่วนการพึ่งพา Cloud Titans (Hyperscalers) ไม่กระจุกตัวเกิน 50%'
    ],
    keyDriver: {
      key: 'data_center_rev_pct',
      label: 'Data Center Revenue %',
      unit: '%',
      safeThreshold: 80,
      dangerThreshold: 70,
      description: 'สัดส่วนรายได้ศูนย์ข้อมูล AI เทียบกับรายได้รวมทั้งหมด'
    },
    sellingProtocol: {
      stopLossRule: 'หลุดเส้น EMA 200 สัปดาห์ติดต่อกัน หรือภาพรวม AI Capex ชะลอตัวรุนแรง',
      freeRideRule: 'กำไรถึง +100% ให้กดขาย 50% ดึงทุนสดออก 100% ถือหุ้นฟรีตลอดกาล',
      moatBreakerCondition: 'Gross Margin หดตัวลง 3 ไตรมาสติดต่อกันจนต่ำกว่า 68%'
    }
  },
  TSM: {
    symbol: 'TSM',
    name: 'Taiwan Semiconductor',
    category: 'Core',
    shortStory: 'โรงหล่อชิปผูกขาดระดับโลกที่ไม่มีใครแทนที่ได้ ชิปไฮเอนด์ 3nm และ 2nm ของโลกกว่า 90% ต้องผลิตที่นี่ ทั้ง Apple, Nvidia และ AMD ล้วนเป็นลูกค้า',
    businessMoat: 'Unmatched Scale, Extreme R&D Capex & EUV Advanced Packaging Dominance',
    moatChecklist: [
      'Advanced Nodes (≤3nm/5nm) ต้องคิดเป็นสัดส่วนมากกว่า 50% ของรายได้รวม',
      'Gross Margin ต้องประคองเหนือ 52% ท่ามกลางการขยายโรงงานในต่างประเทศ',
      'ความตึงเครียดภูมิรัฐศาสตร์ช่องแคบไต้หวันไม่ส่งผลกระทบต่อห่วงโซ่การผลิต'
    ],
    keyDriver: {
      key: 'advanced_nodes_pct',
      label: 'Advanced Nodes (≤3nm/5nm) %',
      unit: '%',
      safeThreshold: 55,
      dangerThreshold: 45,
      description: 'สัดส่วนชิปเทคโนโลยีขั้นสูงที่ให้อัตรากำไรและคูเมืองสูงสุด'
    },
    sellingProtocol: {
      stopLossRule: 'เกิดวิกฤตสงครามช่องแคบไต้หวัน หรือหลุด EMA 200 รายสัปดาห์',
      freeRideRule: 'กำไร +100% ทยอยขาย 50% เก็บทุนสดเข้า Dime FCD',
      moatBreakerCondition: 'คู่แข่ง (เช่น Intel/Samsung) แย่งชิป 2nm สำเร็จเกิน 15%'
    }
  },
  AVGO: {
    symbol: 'AVGO',
    name: 'Broadcom Inc.',
    category: 'Core',
    shortStory: 'ผู้นำเครือข่ายสวิตชิ่ง Tomahawk/Jericho และชิปปรับแต่งพิเศษ (Custom ASIC XPU) สำหรับ Google/Meta ควบคู่กับกระแสเงินสดเหนียวแน่นจาก VMware',
    businessMoat: 'High-Speed Networking Silicon IP & Mission-Critical Enterprise Software',
    moatChecklist: [
      'รายได้ชิป AI (XPU + Networking) ต้องเติบโตตามเป้า $12B+ ต่อปี',
      'การแปลงลูกค้า VMware สู่รูปแบบ Subscription สร้าง Recurring Cash Flow ต่อเนื่อง',
      'Operating Margin ยังคงยืนเหนือ 55%'
    ],
    keyDriver: {
      key: 'ai_revenue_b',
      label: 'AI Semiconductor Run-rate ($B)',
      unit: '$B',
      safeThreshold: 10.0,
      dangerThreshold: 8.0,
      description: 'ยอดส่งมอบชิปเครือข่าย AI และ Custom ASIC ต่อปี'
    },
    sellingProtocol: {
      stopLossRule: 'ลูกค้า Big Tech ลดคำสั่งซื้อ Custom ASIC หรือหลุดแนวรับ EMA 200',
      freeRideRule: 'ขาย 50% เมื่อผลตอบแทนถึง 100% ดึงเงินต้นกลับ',
      moatBreakerCondition: 'Gross Margin รวมลดลงต่อเนื่องเกิน 3 ไตรมาส'
    }
  },
  VRT: {
    symbol: 'VRT',
    name: 'Vertiv Holdings',
    category: 'Core',
    shortStory: 'กระดูกสันหลังด้านพลังงานและระบบระบายความร้อนดาต้าเซ็นเตอร์ ชิป AI ยิ่งกินไฟแรง ยิ่งต้องพึ่งพาระบบ Liquid Cooling และ Switchgear ของ Vertiv',
    businessMoat: 'Data Center Thermal & Power Infrastructure Backlog & Tier-1 Certifications',
    moatChecklist: [
      'ยอดคั่งค้างคำสั่งซื้อ (Backlog) ต้องเติบโตทำ New High ต่อเนื่อง',
      'อัตรากำไรจากการดำเนินงาน (Operating Margin) ขยายตัวสู่ระดับ 20%+',
      'ระยะเวลาส่งมอบระบบ Liquid Cooling ไม่ติดคอขวดซัพพลายเชน'
    ],
    keyDriver: {
      key: 'liquid_cooling_backlog_b',
      label: 'Liquid Cooling Backlog ($B)',
      unit: '$B',
      safeThreshold: 6.0,
      dangerThreshold: 5.0,
      description: 'ยอดคำสั่งซื้อระบบทำความเย็นและโครงสร้างพื้นฐานพลังงาน'
    },
    sellingProtocol: {
      stopLossRule: 'ยอดคำสั่งซื้อ Backlog ติดลบ 2 ไตรมาสติด หรือราคาหลุดเส้น EMA 200',
      freeRideRule: 'ขาย 50% ดึงเงินต้นคืนเมื่อถึงเป้า 1 เด้ง ($P = 2x$ ทุน)',
      moatBreakerCondition: 'คู่แข่ง (เช่น Schneider/Eaton) ชิงส่วนแบ่ง Liquid Cooling เกิน 20%'
    }
  },
  MELI: {
    symbol: 'MELI',
    name: 'MercadoLibre Inc.',
    category: 'Core',
    shortStory: 'Amazon + PayPal + FedEx แห่งละตินอเมริกา ผูกขาดอีคอมเมิร์ซและระบบการเงินดิจิทัลในบราซิล อาร์เจนตินา และเม็กซิโก ด้วยเครือข่ายขนส่งอันทรงพลัง',
    businessMoat: 'Unmatched Logistics Flywheel (Mercado Envios) & Fintech Network Effect (Mercado Pago)',
    moatChecklist: [
      'ยอดปริมาณธุรกรรมการเงิน (TPV) เติบโต > 30% YoY',
      'พอร์ตสินเชื่อ (Credit Portfolio) มีอัตราหนี้เสีย NPL อยู่ในกรอบควบคุมได้',
      'สัดส่วนการจัดส่งสินค้าแบบ Same-Day / Next-Day ยังรักษามาตรฐาน > 75%'
    ],
    keyDriver: {
      key: 'fintech_tpv_b',
      label: 'Fintech Total Payment Volume ($B)',
      unit: '$B',
      safeThreshold: 40.0,
      dangerThreshold: 30.0,
      description: 'มูลค่าการชำระเงินดิจิทัลรวมผ่านแพลตฟอร์ม Mercado Pago'
    },
    sellingProtocol: {
      stopLossRule: 'วิกฤตค่าเงินละตินอเมริกาฉุดกำไรทรุดหนัก หรือราคาหลุดแนวรับ EMA 200',
      freeRideRule: 'ขายทำกำไร 50% ดึงทุนคืนเมื่อราคาหุ้นดับเบิ้ล (+100%)',
      moatBreakerCondition: 'NPL หนี้เสียพุ่งเกิน 12% หรือเสียส่วนแบ่งอีคอมเมิร์ซให้ Shopee/Amazon'
    }
  },
  APH: {
    symbol: 'APH',
    name: 'Amphenol Corporation',
    category: 'Core',
    shortStory: 'ผู้เชี่ยวชาญสายเคเบิลทองแดงความเร็วสูงและขั้วต่อสัญญาณ (Interconnects) ที่ขาดไม่ได้ในเซิร์ฟเวอร์ AI และโครงข่ายอุตสาหกรรม การันตีด้วย ROIC สูงต่อเนื่อง',
    businessMoat: 'High-Precision Engineering & Serial M&A Organic Compounding',
    moatChecklist: [
      'กลุ่มสินค้า IT Datacomm เติบโตสอดรับการส่งมอบ AI Server Racks',
      'รักษาระดับ Operating Margin ในระดับ 20-22% อย่างสม่ำเสมอ',
      'การปิดดีลซื้อกิจการใหม่สร้างมูลค่าเพิ่มทันที (Accretive M&A)'
    ],
    keyDriver: {
      key: 'it_datacomm_pct',
      label: 'IT Datacomm Revenue %',
      unit: '%',
      safeThreshold: 40.0,
      dangerThreshold: 30.0,
      description: 'สัดส่วนรายได้จากการเชื่อมต่อเครือข่ายเซิร์ฟเวอร์และ AI'
    },
    sellingProtocol: {
      stopLossRule: 'การเติบโตของยอดขายหดตัวติดลบ หรือหลุดเส้น EMA 200',
      freeRideRule: 'ดึงเงินต้นออก 50% เมื่อราคาขึ้นถึง 2 เท่าของทุน',
      moatBreakerCondition: 'Optical Interconnect เข้ามาทดแทนทองแดงเร็วกว่าคาด'
    }
  },
  KLAC: {
    symbol: 'KLAC',
    name: 'KLA Corporation',
    category: 'Core',
    shortStory: 'ผู้ผูกขาดเครื่องมือตรวจสอบความบกพร่องของเวเฟอร์ (Process Control & Metrology) ชิปยิ่งมีขนาดเล็กและโครงสร้าง 3D ยิ่งต้องใช้เครื่อง KLA ตรวจจับจุดเสีย',
    businessMoat: 'Monopolistic Intellectual Property in Yield Inspection & Diagnostics',
    moatChecklist: [
      'รักษาส่วนแบ่งการตลาดโลกด้าน Yield Management สูงกว่า 50%',
      'Gross Margin ยืนหยัดอย่างมั่นคงที่ 60-63%',
      'ยอดคำสั่งซื้อเครื่องมือสำหรับเทคโนโลยี 2nm และ GAAFET เพิ่มขึ้น'
    ],
    keyDriver: {
      key: 'process_control_share_pct',
      label: 'Process Control Market Share %',
      unit: '%',
      safeThreshold: 50.0,
      dangerThreshold: 40.0,
      description: 'ส่วนแบ่งการตลาดเครื่องมือตรวจสอบเวเฟอร์ระดับโลก'
    },
    sellingProtocol: {
      stopLossRule: 'วัฏจักรเซมิคอนดักเตอร์หดตัวรุนแรงหรือหลุดเส้น EMA 200',
      freeRideRule: 'ดึงเงินต้นคืนเมื่อกำไร +100%',
      moatBreakerCondition: 'Applied Materials แย่งส่วนแบ่ง Optical Inspection สำเร็จ'
    }
  },
  ANET: {
    symbol: 'ANET',
    name: 'Arista Networks',
    category: 'Core',
    shortStory: 'ผู้นำระบบปฏิบัติการเครือข่าย EOS และสวิตช์ความเร็วสูงพิเศษสำหรับ Cloud Titans และ AI Data Centers ที่ต้องการ Latency ต่ำและ Throughput สูงสุด',
    businessMoat: 'Extensible Operating System (EOS) Single-Image Software Moat',
    moatChecklist: [
      'ยอดขายให้กับ Microsoft และ Meta ยังคงมีคำสั่งซื้อสม่ำเสมอ',
      'ส่วนแบ่งตลาด AI Ethernet Switching ขยายตัวแซงหน้า InfiniBand',
      'Gross Margin ยังคงรักษาระดับเหนือ 60%'
    ],
    keyDriver: {
      key: 'cloud_titan_pct',
      label: 'Cloud Titans Share %',
      unit: '%',
      safeThreshold: 35.0,
      dangerThreshold: 25.0,
      description: 'สัดส่วนรายได้จากผู้ให้บริการคลาวด์รายใหญ่ที่สุดของโลก'
    },
    sellingProtocol: {
      stopLossRule: 'สูญเสียลูกค้ารายใหญ่รายใดรายหนึ่ง หรือหลุดแนวรับ EMA 200',
      freeRideRule: 'ขาย 50% ดึงเงินต้นออกเมื่อผลตอบแทนถึงเป้า 1 เด้ง',
      moatBreakerCondition: 'Cisco ชิงส่วนแบ่ง AI Ethernet หรือ Gross margin ลดลงต่ำกว่า 58%'
    }
  },
  CRWD: {
    symbol: 'CRWD',
    name: 'CrowdStrike Holdings',
    category: 'Core',
    shortStory: 'ผู้นำด้านความปลอดภัยไซเบอร์ระดับ Cloud-Native Falcon แพลตฟอร์มแบบ Single-Agent ที่มีลูกค้าองค์กรทั่วโลก ยิ่งมีข้อมูลภัยคุกคาม AI ยิ่งฉลาดและเหนียวแน่น',
    businessMoat: 'CrowdStrike Falcon Single-Agent Cloud Architecture & Threat Graph Data Moat',
    moatChecklist: [
      'Annual Recurring Revenue (ARR) เติบโตอย่างน้อย 25%+ YoY',
      'Net Retention Rate (NRR) ยังคงรักษาระดับ > 115%',
      'อัตรากำไรเงินสดอิสระ (Free Cash Flow Margin) อยู่ในระดับ 30%+'
    ],
    keyDriver: {
      key: 'arr_usd_b',
      label: 'Annual Recurring Revenue ($B)',
      unit: '$B',
      safeThreshold: 3.8,
      dangerThreshold: 3.5,
      description: 'รายได้สมาชิกแบบประจำต่อเนื่องรายปีของแพลตฟอร์ม Falcon'
    },
    sellingProtocol: {
      stopLossRule: 'เกิดวิกฤตระบบล่มร้ายแรงซ้ำซ้อน หรือราคาหลุดแนวรับ EMA 200',
      freeRideRule: 'ขาย 50% ดึงทุนคืนเมื่อราคาถึง $P = 2x$ ทุน',
      moatBreakerCondition: 'ARR Growth ชะลอตัวลงต่ำกว่า 15% หรือลูกค้าองค์กรยกเลิกสัญญาสูง'
    }
  },
  STRL: {
    symbol: 'STRL',
    name: 'Sterling Infrastructure',
    category: 'Moonshot',
    shortStory: 'บริษัทรับเหมาโครงสร้างพื้นฐานระดับสูง โดยเฉพาะการวางรากฐานและระบบระบายน้ำสำหรับ Data Center และโรงงานชิป ที่มี Margin สูงกว่างานถนนทั่วไปหลายเท่า',
    businessMoat: 'E-Infrastructure Advanced Civil Engineering & High-Margin Mega Project Execution',
    moatChecklist: [
      'สัดส่วนรายได้กลุ่ม E-Infrastructure ยังคงเป็นตัวขับเคลื่อนหลัก (> 45%)',
      'Backlog คำสั่งซื้อรวมยังคงสร้างสถิติสูงสุดใหม่',
      'Operating Margin ยังคงรักษาระดับเหนือ 15%'
    ],
    keyDriver: {
      key: 'e_infra_margin_pct',
      label: 'E-Infrastructure Operating Margin %',
      unit: '%',
      safeThreshold: 15.0,
      dangerThreshold: 12.0,
      description: 'อัตรากำไรจากการดำเนินงานในโครงการก่อสร้างโครงสร้างพื้นฐานไฮเทค'
    },
    sellingProtocol: {
      stopLossRule: 'ขาดทุนในโครงการใหญ่ หรือราคาหลุดเส้น EMA 200',
      freeRideRule: 'หุ้นกลุ่ม Moonshot ขายคืนทุน 50% ทันทีเมื่อกำไรครบ +100%',
      moatBreakerCondition: 'Margin รวมลดลงต่ำกว่า 10% หรือยอด Backlog ลดลงต่อเนื่อง'
    }
  },
  ALAB: {
    symbol: 'ALAB',
    name: 'Astera Labs',
    category: 'Moonshot',
    shortStory: 'ผู้ผลิตชิปเชื่อมต่อความเร็วสูง (Connectivity Silicon) เช่น PCIe Gen 6 และ CXL Retimers / Smart Cable Modules ที่ช่วยแก้ปัญหาคอขวดในการรับส่งข้อมูลระหว่าง GPU ใน AI Cluster',
    businessMoat: 'First-Mover Advantage in PCIe Gen6/CXL Retimer Silicon & Hyperscaler Trust',
    moatChecklist: [
      'ยอดขายเติบโตระดับ Hyper-growth (> 80% YoY)',
      'Gross Margin ยังคงยืนหยัดระดับ 75%+',
      'การเปิดตัวโมดูลเชื่อมต่อ UALink และ CXL มีการทดสอบใช้งานจริงกับลูกค้าหลัก'
    ],
    keyDriver: {
      key: 'pcie_retimer_share_pct',
      label: 'PCIe Gen6/CXL Retimer Share %',
      unit: '%',
      safeThreshold: 75.0,
      dangerThreshold: 60.0,
      description: 'ส่วนแบ่งตลาดชิปขยายสัญญาณ PCIe ในเซิร์ฟเวอร์ AI'
    },
    sellingProtocol: {
      stopLossRule: 'ราคาหลุดเส้น EMA 150/200 หรือคู่แข่งแย่งตลาด Retimer เกิน 30%',
      freeRideRule: 'เมื่อถึงเป้า 1 เด้ง ให้ขาย 50% ทันที เล่นด้วยกำไรฟรี 100%',
      moatBreakerCondition: 'Gross Margin ลดลงฮวบต่ำกว่า 65% จากสงครามราคา'
    }
  },
  PLTR: {
    symbol: 'PLTR',
    name: 'Palantir Technologies',
    category: 'Moonshot',
    shortStory: 'ระบบปฏิบัติการข้อมูลและความมั่นคง AIP (Artificial Intelligence Platform) ที่เชื่อมโยงโมเดล LLM เข้ากับกระบวนการทำงานจริงของกองทัพและภาคธุรกิจระดับองค์กร',
    businessMoat: 'Mission-Critical Ontological Architecture & Extreme Customer Switching Cost',
    moatChecklist: [
      'จำนวนลูกค้าภาคเอกชนในสหรัฐ (US Commercial) เติบโต > 40% YoY',
      'Rule of 40 (Revenue Growth + FCF Margin) ยังคงยืนเหนือ 50%+',
      'การขยายสัญญาจากภาครัฐและกระทรวงกลาโหมยังมีเสถียรภาพ'
    ],
    keyDriver: {
      key: 'us_commercial_growth_pct',
      label: 'US Commercial Revenue YoY %',
      unit: '%',
      safeThreshold: 40.0,
      dangerThreshold: 25.0,
      description: 'อัตราการเติบโตของยอดขายลูกค้าเอกชนสหรัฐผ่านแพลตฟอร์ม AIP'
    },
    sellingProtocol: {
      stopLossRule: 'การเติบโตชะลอตัวลงอย่างมีนัยสำคัญ หรือราคาหลุดเส้น EMA 200',
      freeRideRule: 'ขาย 50% ดึงเงินต้นคืนเมื่อราคาขึ้นถึง 2 เท่าของต้นทุน',
      moatBreakerCondition: 'ลูกค้าองค์กรขนาดใหญ่เปลี่ยนใจไม่ต่อสัญญา หรือ Gross Margin ต่ำกว่า 75%'
    }
  },
  CLS: {
    symbol: 'CLS',
    name: 'Celestica Inc.',
    category: 'Moonshot',
    shortStory: 'ผู้ผลิตฮาร์ดแวร์อิเล็กทรอนิกส์ขั้นสูง (EMS/JDM) ที่ได้รับอานิสงส์เต็มๆ จากการผลิตสวิตช์เครือข่าย 800G และอุปกรณ์เซิร์ฟเวอร์ AI ให้กับ Hyperscalers',
    businessMoat: 'Specialized Joint Design Manufacturing (JDM) for AI Networking & Hyperscalers',
    moatChecklist: [
      'กลุ่มธุรกิจ Connectivity & Cloud Solutions (CCS) เติบโตต่อเนื่อง',
      'Operating Margin ขยายตัวแตะระดับ 6.5-7.5%+',
      'มีคำสั่งซื้อล่วงหน้าครอบคลุมตลอด 12 เดือนข้างหน้า'
    ],
    keyDriver: {
      key: 'connectivity_cloud_pct',
      label: 'CCS Segment Revenue %',
      unit: '%',
      safeThreshold: 60.0,
      dangerThreshold: 50.0,
      description: 'สัดส่วนรายได้จากกลุ่มผลิตภัณฑ์คลาวด์และเครือข่ายไฮเทค'
    },
    sellingProtocol: {
      stopLossRule: 'ลูกค้าคลาวด์ตัดงบ Capex หรือราคาหลุดเส้น EMA 200',
      freeRideRule: 'ขาย 50% ดึงทุนคืนเมื่อราคาถึงเป้า 1 เด้ง',
      moatBreakerCondition: 'Operating Margin หดตัวลงต่ำกว่า 5% หรือสูญเสียลูกค้ารายใหญ่'
    }
  }
};
