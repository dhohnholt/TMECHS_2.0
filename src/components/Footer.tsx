import React from 'react'
import { Link } from 'react-router-dom'
import { School2, Mail, Phone, FileText, HelpCircle } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-tmechs-sage/20 bg-white dark:border-tmechs-forest/30">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* School Info */}
          <div>
            <div className="mb-4 flex items-center">
              <img
                src="https://zgrxawyginizrshjmkum.supabase.co/storage/v1/object/public/site-assets//TMECHS_Logo_Gradient.png"
                alt="TMECHS Logo"
                className="mr-2 h-6 w-6"
              />
              <span className="font-bold text-tmechs-forest">
                TMECHS Monitor
              </span>
            </div>
            <p className="text-sm text-tmechs-forest">
              Transmountain Early College High School
              <br />
              9570 Gateway N Blvd
              <br />
              El Paso, TX 79924
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 font-semibold text-tmechs-forest">
              Quick Links
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/violations"
                  className="text-tmechs-forest hover:text-tmechs-sage"
                >
                  Record Violation
                </Link>
              </li>
              <li>
                <Link
                  to="/attendance"
                  className="text-tmechs-forest hover:text-tmechs-sage"
                >
                  Detention Attendance
                </Link>
              </li>
              <li>
                <Link
                  to="/analytics"
                  className="text-tmechs-forest hover:text-tmechs-sage"
                >
                  View Analytics
                </Link>
              </li>
              <li>
                <Link
                  to="/teacher-signup"
                  className="text-tmechs-forest hover:text-tmechs-sage"
                >
                  Monitor Signup
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="mb-4 font-semibold text-tmechs-forest">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://zgrxawyginizrshjmkum.supabase.co/storage/v1/object/public/site-assets//Teacher%20Handbook.pdf"
                  className="flex items-center text-tmechs-forest hover:text-tmechs-sage"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  User Handbook
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="flex items-center text-tmechs-forest hover:text-tmechs-sage"
                >
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Help Center
                </a>
              </li>
              <li>
                <a
                  href="https://zgrxawyginizrshjmkum.supabase.co/storage/v1/object/public/site-assets//student_privacy_policy.pdf"
                  className="flex items-center text-tmechs-forest hover:text-tmechs-sage"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4 font-semibold text-tmechs-forest">Contact</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="tel:+19157801858"
                  className="flex items-center text-tmechs-forest hover:text-tmechs-sage"
                >
                  <Phone className="mr-2 h-4 w-4" />
                  (915) 236-5000
                </a>
              </li>
              <li>
                <a
                  href="mailto:support@tmechs.edu"
                  className="flex items-center text-tmechs-forest hover:text-tmechs-sage"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  tmechscommunications@episd.org
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-tmechs-sage/20 pt-8 dark:border-tmechs-forest/30">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <p className="text-sm text-tmechs-forest">
              © {new Date().getFullYear()} TMECHS Monitor. All rights reserved.
            </p>
            <div className="mt-4 md:mt-0">
              <img
                src="https://zgrxawyginizrshjmkum.supabase.co/storage/v1/object/public/site-assets//TMECHS_Logo_Gradient.png"
                alt="EPISD Logo"
                className="h-8"
              />
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
