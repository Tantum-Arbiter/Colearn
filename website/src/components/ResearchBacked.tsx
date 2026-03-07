'use client';

import { useLanguage } from '@/i18n/LanguageContext';

const BeakerIcon = () => (
  <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 5.96c.167.708-.28 1.427-.987 1.594a18.01 18.01 0 01-8.43 0c-.708-.167-1.154-.886-.987-1.594l1.402-5.96m12.6 0a18.138 18.138 0 00-12.6 0" />
  </svg>
);

const BookStackIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
  </svg>
);

const BrainIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);



const DeviceIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
  </svg>
);

const TeacherIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);

const ChildIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
  </svg>
);

const BookOpenIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
  </svg>
);

const AcademicCapIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
  </svg>
);

const ChalkboardIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
  </svg>
);

const TimerIcon = () => (
  <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function ResearchBacked() {
  const { t } = useLanguage();

  const researchPoints = [
    {
      icon: <BookStackIcon />,
      title: t.research.literacyResearch,
      description: t.research.literacyResearchDesc,
    },
    {
      icon: <BrainIcon />,
      title: t.research.developingMinds,
      description: t.research.developingMindsDesc,
    },
    {
      icon: <ClockIcon />,
      title: t.research.healthyScreenTime,
      description: t.research.healthyScreenTimeDesc,
    },
  ];

  const researchAreas = [
    { icon: <DeviceIcon />, title: t.research.screenTimeImpact },
    { icon: <TeacherIcon />, title: t.research.earlyEducation },
    { icon: <ChildIcon />, title: t.research.childDevelopment },
    { icon: <BookOpenIcon />, title: t.research.literacyStudies },
    { icon: <AcademicCapIcon />, title: t.research.academicResearch },
    { icon: <ChalkboardIcon />, title: t.research.classroomPractice },
  ];

  return (
    <section id="research" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center bg-brand-teal/20 px-4 py-2 rounded-full text-sm font-medium text-brand-deepBlue mb-4">
            <BeakerIcon />
            {t.research.evidenceBased}
          </div>
          <h2 className="font-rounded text-3xl sm:text-4xl font-bold text-brand-text mb-4">
            {t.research.title} <span className="text-primary">{t.research.titleHighlight}</span> {t.research.titleEnd}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t.research.subtitle}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Research Points */}
          <div className="space-y-8">
            {researchPoints.map((point, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  {point.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">{point.title}</h3>
                  <p className="text-gray-600">{point.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Right - Research Foundation */}
          <div className="bg-white rounded-3xl shadow-card p-8">
            <h3 className="font-rounded font-semibold text-xl mb-6 text-center">
              {t.research.informedBy}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {researchAreas.map((area, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-4 rounded-xl bg-gray-50"
                >
                  <span className="text-primary">{area.icon}</span>
                  <span className="font-medium text-gray-700">{area.title}</span>
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-gray-500 mt-6">
              {t.research.researchFoundation}
            </p>
          </div>
        </div>

        {/* Screen Time Feature Highlight */}
        <div className="mt-16 bg-gradient-brand rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
          {/* Background texture */}
          <div
            className="absolute inset-0 opacity-[0.05] pointer-events-none"
            style={{
              backgroundImage: 'url(/background-home.png)',
              backgroundSize: '600px',
              backgroundPosition: 'center',
              backgroundRepeat: 'repeat',
            }}
          />
          <div className="grid md:grid-cols-2 gap-8 items-center relative">
            <div>
              <h3 className="font-rounded text-2xl md:text-3xl font-bold mb-4">
                {t.research.smartScreenTime}
              </h3>
              <p className="text-white/80 mb-6">
                {t.research.smartScreenTimeDesc}
              </p>
              <ul className="space-y-3">
                {[
                  t.research.setDailyLimits,
                  t.research.gentleAlerts,
                  t.research.weeklyReports,
                  t.research.bedtimeMode,
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-brand-teal" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-center">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
                <div className="mb-4 flex justify-center"><TimerIcon /></div>
                <div className="font-rounded text-4xl font-bold mb-2">25 min</div>
                <div className="text-white/70">{t.research.todaysReading}</div>
                <div className="mt-4 w-full bg-white/20 rounded-full h-2">
                  <div className="bg-brand-teal h-2 rounded-full" style={{ width: '83%' }} />
                </div>
                <div className="text-sm text-white/60 mt-2">{t.research.untilDailyGoal}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

