'use client'

import { useSession, signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import { Input } from '@/components/Input'
import { Textarea } from '@/components/Textarea'
import { getScheduledEmails, getSentEmails, scheduleEmails, type Email } from '@/lib/api'
import { formatDate, parseCSV } from '@/lib/utils'
import toast from 'react-hot-toast'

type Tab = 'scheduled' | 'sent'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('scheduled')
  const [scheduledEmails, setScheduledEmails] = useState<Email[]>([])
  const [sentEmails, setSentEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [recipients, setRecipients] = useState<string[]>([])
  const [startTime, setStartTime] = useState('')
  const [delayBetweenEmails, setDelayBetweenEmails] = useState(2000)
  const [hourlyLimit, setHourlyLimit] = useState(200)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      loadEmails()
      // Refresh every 10 seconds
      const interval = setInterval(loadEmails, 10000)
      return () => clearInterval(interval)
    }
  }, [status, activeTab])

  const loadEmails = async () => {
    try {
      setLoading(true)
      if (activeTab === 'scheduled') {
        const emails = await getScheduledEmails()
        setScheduledEmails(emails)
      } else {
        const emails = await getSentEmails()
        setSentEmails(emails)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load emails')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0]
    if (!uploadedFile) return

    try {
      const emails = await parseCSV(uploadedFile)
      setFile(uploadedFile)
      setRecipients(emails)
      toast.success(`Found ${emails.length} email addresses`)
    } catch (error: any) {
      toast.error('Failed to parse file: ' + error.message)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!subject || !body || recipients.length === 0 || !startTime) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setIsSubmitting(true)
      await scheduleEmails({
        subject,
        body,
        recipients,
        scheduledAt: new Date(startTime).toISOString(),
        delayBetweenEmails,
        hourlyLimit,
      })

      toast.success(`Successfully scheduled ${recipients.length} emails`)
      setIsModalOpen(false)
      resetForm()
      loadEmails()
    } catch (error: any) {
      toast.error(error.message || 'Failed to schedule emails')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setSubject('')
    setBody('')
    setFile(null)
    setRecipients([])
    setStartTime('')
    setDelayBetweenEmails(2000)
    setHourlyLimit(200)
  }

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Email Scheduler</h1>
            <div className="flex items-center gap-4">
              {session?.user?.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  className="w-10 h-10 rounded-full"
                />
              )}
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {session?.user?.name}
                </p>
                <p className="text-xs text-gray-500">{session?.user?.email}</p>
              </div>
              <Button onClick={() => signOut()} variant="outline" size="sm">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs and Compose Button */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-4 border-b border-gray-200">
            <button
              onClick={() => {
                setActiveTab('scheduled')
                loadEmails()
              }}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'scheduled'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Scheduled Emails
            </button>
            <button
              onClick={() => {
                setActiveTab('sent')
                loadEmails()
              }}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'sent'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Sent Emails
            </button>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            Compose New Email
          </Button>
        </div>

        {/* Email Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading emails...</p>
            </div>
          ) : activeTab === 'scheduled' ? (
            scheduledEmails.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-500">No scheduled emails yet.</p>
                <Button
                  onClick={() => setIsModalOpen(true)}
                  className="mt-4"
                  variant="outline"
                >
                  Schedule Your First Email
                </Button>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Scheduled Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {scheduledEmails.map((email) => (
                    <tr key={email.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {email.recipient}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {email.subject}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {email.scheduledAt ? formatDate(email.scheduledAt) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          {email.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : sentEmails.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500">No sent emails yet.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sent Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sentEmails.map((email) => (
                  <tr key={email.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {email.recipient}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {email.subject}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {email.sentAt ? formatDate(email.sentAt) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          email.status === 'SENT'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {email.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Compose Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          resetForm()
        }}
        title="Compose New Email"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            placeholder="Email subject"
          />

          <Textarea
            label="Body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            placeholder="Email body"
            rows={6}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload CSV/Text File
            </label>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {recipients.length > 0 && (
              <p className="mt-2 text-sm text-gray-600">
                Found {recipients.length} email address{recipients.length !== 1 ? 'es' : ''}
              </p>
            )}
          </div>

          <Input
            label="Start Time"
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />

          <Input
            label="Delay Between Emails (ms)"
            type="number"
            value={delayBetweenEmails}
            onChange={(e) => setDelayBetweenEmails(parseInt(e.target.value) || 2000)}
            min={0}
            step={100}
          />

          <Input
            label="Hourly Limit"
            type="number"
            value={hourlyLimit}
            onChange={(e) => setHourlyLimit(parseInt(e.target.value) || 200)}
            min={1}
          />

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false)
                resetForm()
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Scheduling...' : 'Schedule'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
