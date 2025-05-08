// updated UserGuide.jsx with full content in each section
import React, { useState, useEffect } from 'react'

const UserGuide = () => {
  const [isTocOpen, setIsTocOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('')

  const headerImage =
    'https://zgrxawyginizrshjmkum.supabase.co/storage/v1/object/public/site-assets//tmechs-07.jpg'
  const placeholderImage1 =
    'https://zgrxawyginizrshjmkum.supabase.co/storage/v1/object/public/site-assets//tmechs-04.jpg'
  const placeholderImage2 =
    'https://zgrxawyginizrshjmkum.supabase.co/storage/v1/object/public/site-assets//tmechs_banner.png'
  const placeholderImage3 =
    'https://zgrxawyginizrshjmkum.supabase.co/storage/v1/object/public/site-assets//senior_rise_Banner%20Image.jpg'
  const placeholderImage4 =
    'https://zgrxawyginizrshjmkum.supabase.co/storage/v1/object/public/site-assets//tmechs-16.jpg'
  const placeholderImage5 =
    'https://zgrxawyginizrshjmkum.supabase.co/storage/v1/object/public/site-assets//tmechs-06.jpg'
  const placeholderImage6 =
    'https://zgrxawyginizrshjmkum.supabase.co/storage/v1/object/public/site-assets//tmechs-03.jpg'

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('section[id]')
      let currentSection = ''
      sections.forEach(section => {
        const rect = section.getBoundingClientRect()
        if (rect.top <= 150 && rect.bottom >= 150) {
          currentSection = section.id
        }
      })
      setActiveSection(currentSection)
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
          }
        })
      },
      { threshold: 0.1 }
    )

    const animatedSections = document.querySelectorAll('.animate-on-scroll')
    animatedSections.forEach(section => observer.observe(section))

    window.addEventListener('scroll', handleScroll)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      observer.disconnect()
    }
  }, [])

  const tocItems = [
    {
      id: 'create-schedule',
      title: 'Create a Schedule',
      content: `The first step in using the attendance system is to create your class schedule. Each period you teach needs to be added before you can upload a roster or begin taking attendance. This allows the system to organize students by period and match attendance records accurately.

Navigate to the Class Manager page from the main menu. There, you can add each class period by specifying a period number (e.g., 1, 2, 3) and giving the class a descriptive name (e.g., Biology – 2nd Period). You can add multiple periods at once, and they’ll be saved to your profile.

Once a period is added, it becomes selectable in other parts of the system—such as when uploading student rosters or taking daily attendance. Be sure to double-check your entries for typos or misnumbered periods, as this ensures student data flows correctly.`,
      image: placeholderImage1,
    },
    {
      id: 'upload-roster',
      title: 'Upload Roster IDs',
      content: `Once you’ve created your schedule, the next step is to upload your student rosters. This connects students to the specific periods you teach.

To upload a roster, go to the Class Manager and select the period from the dropdown. Then click the “Upload Roster” button and select your CSV file. This file should contain student names, IDs, and barcode numbers. You can download a CSV template from the Student Management page if needed.

After uploading, you’ll see students populate under that period, and the roster will be ready for attendance tracking.`,
      image: placeholderImage2,
    },
    {
      id: 'personalize-sounds',
      title: 'Personalize Sounds',
      content: `For added fun and personalization, you can upload custom sounds that play when a student is scanned during attendance.

Visit the Student Management page, locate the student you want to personalize, and click “Edit.” There, you can upload an MP3 file under the Sound field. Save your changes and the next time that student is scanned, their unique sound will play.

This feature helps with recognition and adds a layer of engagement to the attendance process.`,
      image: placeholderImage3,
    },
    {
      id: 'take-attendance',
      title: 'Take Attendance',
      content: `The Daily Attendance page is where you take attendance for each class period. Begin by selecting a valid school date using the date picker. Then, choose the period from your schedule.

Students will load into a roster view. You can scan their barcodes to mark them present, or manually update their attendance status using checkboxes. Use the “Tardy” checkbox or add notes if necessary (e.g., excused or medical leave).

Once all entries are marked, click “Submit Attendance” to save records to the database.`,
      image: placeholderImage4,
    },
    {
      id: 'track-attendance',
      title: 'Track Attendance',
      content: `You can monitor and analyze attendance patterns directly from the Daily Attendance page. After selecting a period and date, scroll to the footer of the student table.

Here you’ll see totals for Present, Absent, Tardy, and the total number of students enrolled. Use the “Show only absent” filter to narrow your focus. You can also review past attendance records by changing the date.

This helps you stay on top of student engagement and provides documentation when needed.`,
      image: placeholderImage5,
    },
    {
      id: 'log-out',
      title: 'Log Out Securely',
      content: `Always remember to log out of the system when you're done using it, especially on shared devices.

Click the Logout button located at the top-right of most pages. This ensures your session ends properly and student data remains secure.

If you forget to log out, you may stay signed in for a limited time, but logging out is the best practice for safeguarding sensitive information.`,
      image: placeholderImage6,
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 font-sans">
      <header
        className="relative bg-cover bg-center px-6 py-16 text-center text-white shadow-lg"
        style={{ backgroundImage: `url(${headerImage})` }}
      >
        <div className="absolute inset-0 bg-black/40"></div>
        <h1 className="animate-fade-in-down relative text-5xl font-extrabold shadow-md md:text-6xl">
          TMECHS Monitor User Guide
        </h1>
        <p className="md:text-md animate-fade-in-up relative mt-4 text-lg opacity-90 shadow-xl">
          Your ultimate guide to managing classroom attendance with ease and
          efficiency.
        </p>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 md:flex-row">
        <aside
          className={`fixed left-0 top-0 z-40 h-full w-64 transform bg-white p-6 shadow-lg transition-transform duration-300 ${
            isTocOpen ? 'translate-x-0' : '-translate-x-full'
          } md:sticky md:top-24 md:w-1/4 md:translate-x-0 md:p-0 md:shadow-none`}
        >
          <div className="md:rounded-xl md:bg-white md:p-6 md:shadow-lg">
            <h2 className="mb-4 text-xl font-semibold text-tmechs-forest">
              Table of Contents
            </h2>
            <ul className="space-y-2">
              {tocItems.map(item => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={() => setIsTocOpen(false)}
                    className={`block text-sm font-medium transition-colors duration-300 ${
                      activeSection === item.id
                        ? 'font-bold text-tmechs-forest'
                        : 'text-gray-600 hover:text-tmechs-forest'
                    }`}
                  >
                    {item.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {isTocOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
            onClick={() => setIsTocOpen(false)}
          ></div>
        )}

        <main className="space-y-12 md:w-3/4">
          {tocItems.map((item, index) => (
            <section
              key={item.id}
              id={item.id}
              className="animate-on-scroll scroll-mt-28 rounded-xl bg-white p-8 shadow-lg"
            >
              <h2 className="mb-4 text-3xl font-bold text-tmechs-forest">
                {index + 1}. {item.title}
              </h2>
              <p className="mb-4 whitespace-pre-line text-gray-700">
                {item.content}
              </p>
              <div className="mt-6">
                <img
                  src={item.image}
                  alt={`Screenshot for ${item.title}`}
                  className="w-full rounded-lg border border-gray-200 shadow-md transition-transform duration-300 hover:scale-105"
                />
              </div>
              <div className="mt-4 rounded-lg bg-tmechs-sage/10 p-4">
                <p className="text-sm text-gray-600">
                  <strong>Tip:</strong> Helpful info or reminders related to{' '}
                  {item.title}.
                </p>
              </div>
            </section>
          ))}
        </main>
      </div>

      <footer className="bg-gradient-to-r from-tmechs-forest to-tmechs-sage px-6 py-8 text-center text-white">
        <p className="text-sm opacity-90">
          Need help? Contact support at{' '}
          <a
            href="mailto:support@tmechsmonitor.org"
            className="underline hover:opacity-80"
          >
            support@tmechsmonitor.org
          </a>
          .
        </p>
        <p className="mt-2 text-sm opacity-90">Last updated: April 18, 2025</p>
      </footer>

      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down {
          animation: fadeInDown 1s ease-out forwards;
        }
        .animate-fade-in-up {
          animation: fadeInUp 1s ease-out forwards;
          animation-delay: 0.3s;
        }
        .animate-on-scroll {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }
        .animate-on-scroll.visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </div>
  )
}

export default UserGuide
