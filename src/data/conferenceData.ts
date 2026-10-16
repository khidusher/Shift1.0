import { Speaker, ScheduleItem } from '../types';

export const CONFERENCE_INFO = {
  name: 'SHIFT 1.0',
  theme: 'Beyond the Degree: Building Your Career, Purpose & Legacy',
  organizers: 'Worldwide Evangelism Service (WES) in partnership with the UENR Student Christian Council (SCC)',
  shortOrganizers: 'WES & UENR SCC',
  convener: 'Gen. Sec. Justice Kelvin Larnyoh',
  dateFormatted: 'Saturday, Nov 28, 2026',
  dateShort: 'NOV 28, 2026',
  time: '2:00 PM – 6:00 PM GMT',
  doorsOpen: '1:15 PM GMT',
  venue: 'UENR Main Auditorium',
  venueFull: 'University of Energy and Natural Resources, Sunyani, Bono Region, Ghana',
  totalCapacity: 500,
  initialClaimedSeats: 0,
  whatsappPrimary: '+233 24 123 4567',
  whatsappSecondary: '+233 50 987 6543',
  officialEmail: 'info@shiftconference.org',
  supportEmail: 'help@uenscc.org',
  tagline: 'Connecting faith with career growth, personal purpose, and long-term impact.',
  coreQuote: 'Equipping university scholars to anchor their careers in excellence and kingdom purpose beyond the classroom.'
};

export const SPEAKERS: Speaker[] = [
  {
    id: 'proph-kofi-boakye-fosuhene',
    name: 'Proph. Kofi Boakye Fosuhene',
    role: 'GENERAL OVERSEER & HOST',
    company: 'Worldwide Evangelism Service (WES)',
    image: '/images/speakers/proph_kofi_boakye_fosuhene.jpg',
    topic: 'The Apostolic Mandate: Marketplace Purpose & Kingdom Influence',
    bio: 'Prophet Kofi Boakye Fosuhene is the General Overseer of Worldwide Evangelism Service (WES) and the vision bearer of SHIFT. He is passionately dedicated to empowering university students and young professionals to harmonize spiritual conviction with market-leading competence.',
    keyTakeaways: [
      'Discovering divine assignment and kingdom vocation beyond academic certificates',
      'Building spiritual resilience to maintain integrity in professional spheres',
      'Unlocking marketplace authority and transformative leadership'
    ]
  },
  {
    id: 'col-robert-narh',
    name: 'Col. Robert Narh',
    role: 'GOVERNANCE & STRATEGIC LEADERSHIP MENTOR',
    company: 'Ghana Armed Forces / Strategic Leadership',
    image: '/images/speakers/col_robert_narh.jpg',
    topic: 'Command, Character & Conscience: Leadership Under Pressure',
    bio: 'Colonel Robert Narh is a seasoned senior military officer and institutional leadership mentor. He brings decades of high-stakes strategic governance, character formation, and operational discipline to guide emerging leaders in navigating high-pressure careers with unwavering ethical grounding.',
    keyTakeaways: [
      'Developing disciplined habits of execution and steadfast decision-making',
      'Ethical courage and staying true to core values in corporate leadership',
      'Strategic crisis management and team building under pressure'
    ]
  },
  {
    id: 'dr-april-dobson',
    name: 'Dr. April Dobson',
    role: 'HEALTHCARE EXECUTIVE & ACADEMIC MENTOR',
    company: 'Global Health & Leadership Institute',
    image: '/images/speakers/dr_april_dobson.jpg',
    topic: 'Pioneering Impact: Excellence, Innovation & Community Service',
    bio: 'Dr. April Dobson is a distinguished healthcare professional, academic researcher, and visionary mentor. She has spearheaded transformative health advocacy and youth leadership programs across Africa, mentoring university scholars to excel in science, public policy, and community transformation.',
    keyTakeaways: [
      'Translating academic research and degrees into tangible community solutions',
      'Mentorship as an engine for rapid career elevation and international impact',
      'Balancing compassionate service with executive rigor and technical mastery'
    ]
  },
  {
    id: 'ing-fidel-nyarko',
    name: 'Ing. Fidel Nyarko',
    role: 'ENGINEERING CONSULTANT & INFRASTRUCTURE LEADER',
    company: 'Engineering & Technological Innovation',
    image: '/images/speakers/ing_fidel_nyarko.jpg',
    topic: 'Engineering Africa’s Future: Technology, Purpose & Innovation',
    bio: 'Ing. Fidel Nyarko is a licensed consulting engineer and technological innovator with extensive experience directing major industrial and infrastructural developments. He equips budding scientists and engineers with practical frameworks to lead Africa’s technological renaissance.',
    keyTakeaways: [
      'Bridging the chasm between theoretical university coursework and industry practice',
      'Innovation frameworks for young engineers to build scalable local solutions',
      'Navigating professional engineering licensure and international standards'
    ]
  },
  {
    id: 'dorcas-adisah-wumbee',
    name: 'Dorcas Adisah Wumbee Esq.',
    role: 'LEGAL PRACTITIONER & CORPORATE COUNSEL',
    company: 'Legal Advisory & Corporate Governance',
    image: '/images/speakers/dorcas_adisah_wumbee.jpg',
    topic: 'The Legal Frontier: Ethics, Governance & Defending Integrity',
    bio: 'Dorcas Adisah Wumbee Esq. is an esteemed barrister and corporate solicitor specializing in civil litigation, corporate compliance, and human rights advocacy. She mentors young female professionals and scholars to break barriers in corporate law and boardroom governance.',
    keyTakeaways: [
      'Mastering professional advocacy, negotiation, and corporate boardroom etiquette',
      'Standing firm in ethical integrity when challenged by workplace compromises',
      'Navigating career transitions and building enduring professional repute'
    ]
  },
  {
    id: 'george-nutor',
    name: 'George Nutor',
    role: 'MINING EXECUTIVE & INDUSTRIAL OPERATIONS LEADER',
    company: 'Gold Fields Ghana',
    image: '/images/speakers/george_nutor.jpg',
    topic: 'Building Operational Excellence: From Campus to the Boardroom',
    bio: 'George Nutor is an executive operations leader in the heavy mining and industrial engineering sector. Having risen through technical ranks into executive governance, he provides university graduates with pragmatic roadmaps for workplace leadership, operational discipline, and value creation.',
    keyTakeaways: [
      'Ascending from frontline technician to executive decision-maker',
      'Operational discipline and safety culture in heavy industry and engineering',
      'Negotiating high-value industrial contracts and managing diverse talent'
    ]
  },
  {
    id: 'bernard-k-sackitey',
    name: 'Bernard K. Sackitey',
    role: 'ENTERPRISE STRATEGIST & CAPITAL GROWTH EXECUTIVE',
    company: 'Business Advisory & Commercial Growth',
    image: '/images/speakers/bernard_k_sackitey.jpg',
    topic: 'Unlocking Enterprise Value: Financial Wisdom, Wealth & Legacy',
    bio: 'Bernard K. Sackitey is a senior business executive, financial strategist, and enterprise growth mentor. He guides university students and entrepreneurs in mastering commercial viability, capital allocation, and building sustainable commercial enterprises with generational impact.',
    keyTakeaways: [
      'Financial intelligence and early-career wealth building principles',
      'Turning student ideas into bankable, commercially viable enterprises',
      'Capital fundraising strategies and pitching to institutional investors'
    ]
  },
  {
    id: 'musu-kiawu-sue',
    name: 'Musu Kiawu Sue',
    role: 'PURPOSE COACH & INTERNATIONAL DEVELOPMENT STRATEGIST',
    company: 'Kingdom Impact Initiatives',
    image: '/images/speakers/musu_kiawu_sue.jpg',
    topic: 'Unveiling Your Identity: Vocation, Faith & Global Significance',
    bio: 'Musu Kiawu Sue is an international development practitioner, certified purpose coach, and inspirational speaker. She inspires tertiary students across West Africa to dismantle self-limiting mindsets and boldly step into global fellowships, diplomacy, and purposeful enterprise.',
    keyTakeaways: [
      'Uncovering unique core strengths and aligning vocation with global needs',
      'Accessing international fellowships, scholarships, and global impact platforms',
      'Cultivating spiritual confidence in multicultural and international spaces'
    ]
  },
  {
    id: 'justice-kelvin-larnyoh',
    name: 'Gen. Sec. Justice Kelvin Larnyoh',
    role: 'CONVENER & GENERAL SECRETARY',
    company: 'Worldwide Evangelism Service (WES) x UENR SCC',
    image: '/images/speakers/justice_kelvin_larnyoh.jpg',
    topic: 'Beyond the Degree: Igniting Campus Fire for Workplace Dominance',
    bio: 'General Secretary Justice Kelvin Larnyoh serves as the Chief Convener of SHIFT 1.0. Mobilizing student ministries and campus fellowships across Ghanaian universities, he champions spiritual awakening married to extraordinary professional diligence.',
    keyTakeaways: [
      'The vision behind SHIFT 1.0: Why academic excellence must meet kingdom purpose',
      'Leveraging tertiary campus networks for lifetime career acceleration',
      'Walking as salt and light in corporate Ghana and beyond'
    ]
  }
];

export const CONTINUOUS_LINEUP: Speaker[] = SPEAKERS;

export const SCHEDULE: ScheduleItem[] = [
  {
    id: 'sch-1',
    time: '1:15 PM – 2:00 PM',
    title: 'Delegate Arrival, Fast-Track Check-In & Networking',
    location: 'Auditorium Foyer & Digital Desk',
    category: 'Ceremony',
    description: 'Doors open. Delegates scan their SMS entrance pass, collect conference badges, and connect with fellow students.'
  },
  {
    id: 'sch-2',
    time: '2:00 PM – 2:25 PM',
    title: 'Opening Invocation & Welcome Address',
    speaker: 'Gen. Sec. Justice Kelvin Larnyoh',
    location: 'Main Auditorium Stage',
    category: 'Ceremony',
    description: 'Official opening ceremony, worship, and introduction to the vision of SHIFT 1.0 by Worldwide Evangelism Service & UENR SCC leaders.'
  },
  {
    id: 'sch-3',
    time: '2:25 PM – 3:15 PM',
    title: 'Keynote Address: Beyond the Degree — Building Your Career, Purpose & Legacy',
    speaker: 'Proph. Kofi Boakye Fosuhene & Col. Robert Narh',
    location: 'Main Auditorium Stage',
    category: 'Keynote',
    description: 'Foundational plenary session unpacking how young Christians can transcend mere academic qualifications to build sustainable careers and divine legacies.'
  },
  {
    id: 'sch-4',
    time: '3:15 PM – 4:00 PM',
    title: 'Fireside Panel: Bridging the Chasm from Campus to Marketplace',
    speaker: 'Dr. April Dobson, Ing. Fidel Nyarko, Dorcas Adisah Wumbee Esq. & George Nutor',
    location: 'Main Auditorium Stage',
    category: 'Panel',
    description: 'Interactive candid panel discussion with industry mentors addressing real questions submitted by UENR students on career pivots, integrity, and operational mastery.'
  },
  {
    id: 'sch-5',
    time: '4:00 PM – 4:50 PM',
    title: 'Specialized Masterclass Breakouts',
    speaker: 'Bernard K. Sackitey, Musu Kiawu Sue & Ing. Fidel Nyarko',
    location: 'Breakout Rooms A, B & Auditorium Hall',
    category: 'Breakout',
    description: 'Hands-on tracks: (A) Engineering & Tech Innovation; (B) Enterprise Capital & Wealth Building; (C) Purpose Discovery & Global Vocation.'
  },
  {
    id: 'sch-6',
    time: '4:50 PM – 5:25 PM',
    title: 'Career Toolkit Distribution & Digital Certificate Issuance',
    location: 'Main Auditorium Stage',
    category: 'Ceremony',
    description: 'Distribution of exclusive curated PDF guides, scholarship resource kits, and real-time generation of verified Certificates of Attendance.'
  },
  {
    id: 'sch-7',
    time: '5:25 PM – 6:00 PM',
    title: 'Commissioning Prayer, Anointing & Networking Mixer',
    speaker: 'WES & UENR SCC Pastoral Team',
    location: 'Auditorium & Courtyard',
    category: 'Networking',
    description: 'Closing impartation prayer, dedicatory blessing for students facing exams/national service, and open 1-on-1 networking with speakers.'
  }
];

export const INCLUDED_PERKS = [
  { icon: 'Award', title: 'Keynote Mentorship', desc: 'Direct access to senior design directors and tech leads' },
  { icon: 'Users', title: 'Interactive Breakouts', desc: 'Practical tracks in design, enterprise, and vocation' },
  { icon: 'MessageSquare', title: 'Networking Mixer', desc: 'Connect with visionary peers across UENR and Ghana' },
  { icon: 'CheckCircle2', title: 'Certificate of Attendance', desc: 'Official digital credential from WES & UENR SCC' },
  { icon: 'BookOpen', title: 'Career Toolkit PDFs', desc: 'Curated resumes, portfolio frameworks & scholarship lists' }
];

export const FAQS = [
  {
    q: 'Is SHIFT 1.0 free of charge for students?',
    a: 'Yes! Registration is 100% free, generously underwritten by Worldwide Evangelism Service (WES) in partnership with the UENR Student Christian Council (SCC).'
  },
  {
    q: 'Who is eligible to attend?',
    a: 'All UENR students (Levels 100, 200, 300, 400), postgraduates, alumni, and youth from surrounding institutions and community fellowships are welcome.'
  },
  {
    q: 'How do I access the venue on the event day?',
    a: 'Upon registering on this portal, you will instantly receive your digital ticket with your unique Pass ID (e.g. SHFT-XXXX-UENR). Present it at the entrance desks for fast-track badge collection.'
  },
  {
    q: 'Will participants receive a certificate?',
    a: 'Yes, all verified attendees will receive an official verifiable digital Certificate of Attendance sent via their registered email address.'
  },
  {
    q: 'Where exactly is the venue on the UENR campus?',
    a: 'The event takes place at the UENR Main Auditorium, University of Energy and Natural Resources, Sunyani. Directional ushers will be stationed at campus entry points.'
  }
];
