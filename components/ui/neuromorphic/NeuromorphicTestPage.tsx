"use client"

/**
 * Neuromorphic UI Component Library – test page
 * Accessible, animated, modern design patterns. Scoped to this page only.
 * Uses site theme (next-themes) for light/dark mode — stays in sync with header toggle.
 * Date: Feb 18, 2026
 */

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  FormEvent,
  KeyboardEvent,
  MouseEvent,
} from "react"
import { useTheme } from "next-themes"
import {
  Sun,
  Moon,
  MousePointerClick,
  ToggleLeft,
  Badge,
  MessageSquare,
  ChevronDown,
  ChevronsDown,
  Loader2,
  Check,
  Home,
  Settings,
  Bell,
  User,
  TextCursorInput,
  Search,
  CalendarClock,
  Calendar,
  Clock,
  UploadCloud,
  CloudUpload,
  Loader,
  Loader2 as Loader2Icon,
  BellRing,
  Layout,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Table,
  BarChart3,
  PieChart,
  ChevronsRight,
  GitBranch,
  LayoutGrid,
  MousePointer2,
  FolderTree,
  Folder,
  FolderOpen,
  FileCode,
  File,
  FileJson,
  FileText,
  ChevronRight,
  Copy,
  Scissors,
  Clipboard,
  Trash2,
  X,
  Zap,
  ShieldCheck,
  Sparkles,
  Globe,
  Info,
} from "lucide-react"
import { useNeuromorphicToast, type ToastType } from "./useNeuromorphicToast"
import "./neuromorphic-styles.css"

const TABS = [
  { id: "basics", label: "Basics" },
  { id: "forms", label: "Forms" },
  { id: "feedback", label: "Feedback" },
  { id: "data", label: "Data" },
  { id: "advanced", label: "Advanced" },
] as const

const TOAST_CONFIG: Record<
  ToastType,
  { bg: string; icon: React.ElementType }
> = {
  success: { bg: "from-green-500 to-green-600", icon: CheckCircle2 },
  error: { bg: "from-red-500 to-red-600", icon: XCircle },
  warning: { bg: "from-yellow-500 to-yellow-600", icon: AlertTriangle },
  info: { bg: "from-blue-500 to-blue-600", icon: Info },
}

const COUNTRIES = [
  { value: "us", label: "🇺🇸 United States" },
  { value: "uk", label: "🇬🇧 United Kingdom" },
  { value: "ca", label: "🇨🇦 Canada" },
  { value: "au", label: "🇦🇺 Australia" },
  { value: "de", label: "🇩🇪 Germany" },
  { value: "fr", label: "🇫🇷 France" },
  { value: "jp", label: "🇯🇵 Japan" },
  { value: "in", label: "🇮🇳 India" },
]

const MULTI_SELECT_OPTIONS = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "react", label: "React" },
  { value: "vue", label: "Vue.js" },
  { value: "nodejs", label: "Node.js" },
  { value: "python", label: "Python" },
]

const TABLE_ROWS = [
  { name: "John Doe", email: "john@example.com", status: "Active", role: "Admin" },
  { name: "Jane Smith", email: "jane@example.com", status: "Pending", role: "Editor" },
  { name: "Bob Johnson", email: "bob@example.com", status: "Inactive", role: "Viewer" },
]

export function NeuromorphicTestPage() {
  const { toasts, show, dismiss } = useNeuromorphicToast()
  const { setTheme, resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const [activeTab, setActiveTab] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [accordionOpen, setAccordionOpen] = useState<Record<number, boolean>>({
    0: true,
    1: false,
    2: false,
  })
  const [notificationsOn, setNotificationsOn] = useState(false)
  const [termsChecked, setTermsChecked] = useState(false)
  const [plan, setPlan] = useState<"free" | "pro">("free")
  const [loading, setLoading] = useState(false)
  const [countryOpen, setCountryOpen] = useState(false)
  const [countrySearch, setCountrySearch] = useState("")
  const [selectedCountry, setSelectedCountry] = useState("")
  const [multiSelectOpen, setMultiSelectOpen] = useState(false)
  const [multiSelectSelected, setMultiSelectSelected] = useState<string[]>([])
  const [volume, setVolume] = useState(50)
  const [starRating, setStarRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [files, setFiles] = useState<{ id: string; name: string; size: number }[]>([])
  const [progress, setProgress] = useState(0)
  const [progressRunning, setProgressRunning] = useState(false)
  const [tableSearch, setTableSearch] = useState("")
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [treeExpanded, setTreeExpanded] = useState<Record<string, boolean>>({
    src: true,
    components: false,
  })
  const [dateValue, setDateValue] = useState("")
  const [timeValue, setTimeValue] = useState("")
  const [formErrors, setFormErrors] = useState<{ name?: string; email?: string }>({})
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const contextAreaRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // Modal focus trap
  useEffect(() => {
    if (!modalOpen || !modalRef.current) return
    const focusable = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    first?.focus()
    function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
      if (e.key !== "Tab") return
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }
    const el = modalRef.current
    el.addEventListener("keydown", onKeyDown as unknown as EventListener)
    return () => el.removeEventListener("keydown", onKeyDown as unknown as EventListener)
  }, [modalOpen])

  // Escape to close modal / context menu
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setModalOpen(false)
        setContextMenu(null)
        setCountryOpen(false)
        setMultiSelectOpen(false)
      }
    }
    window.addEventListener("keydown", onKey as unknown as EventListener)
    return () => window.removeEventListener("keydown", onKey as unknown as EventListener)
  }, [])

  const toggleAccordion = useCallback((i: number) => {
    setAccordionOpen((prev) => ({ ...prev, [i]: !prev[i] }))
  }, [])

  const filteredCountries = COUNTRIES.filter((c) =>
    c.label.toLowerCase().includes(countrySearch.toLowerCase())
  )

  const filteredTableRows = TABLE_ROWS.filter(
    (row) =>
      !tableSearch.trim() ||
      Object.values(row).some((v) =>
        String(v).toLowerCase().includes(tableSearch.toLowerCase())
      )
  )

  const toggleMultiOption = useCallback((value: string) => {
    setMultiSelectSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }, [])

  const handleContactSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const form = e.currentTarget
      const name = (form.elements.namedItem("name") as HTMLInputElement)?.value?.trim()
      const email = (form.elements.namedItem("email") as HTMLInputElement)?.value?.trim()
      const errors: { name?: string; email?: string } = {}
      if (!name) errors.name = "Name is required"
      if (!email) errors.email = "Email is required"
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Please enter a valid email"
      setFormErrors(errors)
      if (Object.keys(errors).length === 0) {
        show("success", "Form Submitted", "Your message has been sent successfully!")
        form.reset()
        setFormErrors({})
      }
    },
    [show]
  )

  const startProgress = useCallback(() => {
    if (progressRunning) return
    setProgressRunning(true)
    setProgress(0)
    progressRef.current = setInterval(() => {
      setProgress((p) => {
        const next = p + Math.random() * 15
        if (next >= 100) {
          if (progressRef.current) clearInterval(progressRef.current)
          progressRef.current = null
          setProgressRunning(false)
          show("success", "Complete!", "Upload finished successfully")
          return 100
        }
        return next
      })
    }, 300)
  }, [progressRunning, show])

  const resetProgress = useCallback(() => {
    if (progressRef.current) {
      clearInterval(progressRef.current)
      progressRef.current = null
    }
    setProgress(0)
    setProgressRunning(false)
  }, [])

  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files
      if (!list?.length) return
      const allowedTypes = ["image/png", "image/jpeg", "image/gif", "application/pdf"]
      const maxSize = 10 * 1024 * 1024
      let added = 0
      Array.from(list).forEach((file) => {
        if (!allowedTypes.includes(file.type)) {
          show("error", "Invalid File", `${file.name}: File type not allowed`)
          return
        }
        if (file.size > maxSize) {
          show("error", "File Too Large", `${file.name}: Maximum size is 10MB`)
          return
        }
        setFiles((prev) => [
          ...prev,
          { id: `f-${Math.random().toString(36).slice(2)}`, name: file.name, size: file.size },
        ])
        added++
      })
      if (added > 0) show("success", "Files Added", `${added} file(s) ready for upload`)
      e.target.value = ""
    },
    [show]
  )

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const displayDate = useCallback(() => {
    if (dateValue && timeValue) {
      const [y, mo, d] = dateValue.split("-").map(Number)
      const [h, min] = timeValue.split(":").map(Number)
      const dt = new Date(y, mo - 1, d, h, min)
      return `${dt.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} at ${dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`
    }
    if (dateValue) {
      const [y, mo, d] = dateValue.split("-").map(Number)
      const dt = new Date(y, mo - 1, d)
      return `Date: ${dt.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`
    }
    if (timeValue) {
      const [h, min] = timeValue.split(":").map(Number)
      const dt = new Date()
      dt.setHours(h, min)
      return `Time: ${dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`
    }
    return "Select a date and time above"
  }, [dateValue, timeValue])

  const wrapperClass = `neuromorphic-page min-h-screen pb-20 ${isDark ? "neuromorphic-dark" : ""}`

  return (
    <div className={wrapperClass}>
      <link
        rel="preconnect"
        href="https://fonts.googleapis.com"
      />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin=""
      />
      {/* Skip link */}
      <a href="#main-content" className="neu-skip-link">
        Skip to main content
      </a>

      {/* Toast container */}
      <div
        className="fixed top-20 right-4 z-50 flex flex-col gap-3 pointer-events-none"
        role="status"
        aria-live="polite"
        aria-atomic={false}
      >
        {toasts.map((t) => {
          const config = TOAST_CONFIG[t.type]
          const Icon = config.icon
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl min-w-[280px] max-w-sm bg-gradient-to-br ${config.bg} shadow-lg ${t.exiting ? "neu-toast-exit" : "neu-toast-enter"}`}
              role="alert"
            >
              <Icon className="text-white mt-0.5 flex-shrink-0 w-5 h-5" aria-hidden />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{t.title}</p>
                <p className="text-xs text-white/80">{t.message}</p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="text-white/80 hover:text-white p-1 rounded focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            </div>
          )
        })}
      </div>

      {/* Theme toggle — syncs with site theme (header toggle) */}
      <div className="fixed top-4 right-4 z-40">
        <button
          type="button"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="neu-raised neu-btn neu-focus w-14 h-14 rounded-2xl flex items-center justify-center"
          aria-label="Toggle dark mode"
          aria-pressed={isDark}
        >
          {isDark ? (
            <Moon className="w-6 h-6 text-gray-300" aria-hidden />
          ) : (
            <Sun className="w-6 h-6 text-gray-600" aria-hidden />
          )}
        </button>
      </div>

      {/* Header */}
      <header className="pt-16 pb-8 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full neu-raised-sm mb-6">
            <span
              className="w-2 h-2 rounded-full bg-green-400 animate-pulse"
              aria-hidden
            />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300 tracking-wide uppercase">
              Live Components
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-gray-800 dark:text-gray-100 mb-4">
            Neuromorphic UI
          </h1>
          <p className="text-base md:text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            A complete component library with accessibility, animations, and modern design patterns.
          </p>
        </div>
      </header>

      <main id="main-content" className="max-w-7xl mx-auto px-4">
        {/* Tab navigation */}
        <nav
          className="mb-12 overflow-x-auto neu-custom-scrollbar"
          aria-label="Component categories"
        >
          <div
            className="flex gap-2 p-2 rounded-2xl mx-auto w-fit min-w-max neu-inset"
            role="tablist"
            aria-orientation="horizontal"
          >
            {TABS.map((tab, i) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={activeTab === i}
                aria-controls={`panel-${tab.id}`}
                tabIndex={activeTab === i ? 0 : -1}
                className={`neu-tab-btn neu-focus px-6 py-3 rounded-xl text-sm font-medium transition-all`}
                onClick={() => setActiveTab(i)}
                onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
                  if (e.key === "ArrowRight") {
                    e.preventDefault()
                    setActiveTab((i + 1) % TABS.length)
                  }
                  if (e.key === "ArrowLeft") {
                    e.preventDefault()
                    setActiveTab((i - 1 + TABS.length) % TABS.length)
                  }
                  if (e.key === "Home") {
                    e.preventDefault()
                    setActiveTab(0)
                  }
                  if (e.key === "End") {
                    e.preventDefault()
                    setActiveTab(TABS.length - 1)
                  }
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* ==================== BASICS PANEL ==================== */}
        {activeTab === 0 && (
          <section
            id="panel-basics"
            role="tabpanel"
            aria-labelledby="tab-basics"
            tabIndex={0}
            className="tab-panel"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Buttons card */}
              <article className="neu-raised p-6 rounded-3xl">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-6 tracking-tight flex items-center gap-2">
                  <MousePointerClick className="w-5 h-5" aria-hidden />
                  Buttons
                </h2>
                <div className="space-y-4">
                  <button
                    type="button"
                    className="neu-raised neu-btn neu-focus w-full py-3 px-6 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300"
                  >
                    Default
                  </button>
                  <button
                    type="button"
                    className="neu-btn neu-focus w-full py-3 px-6 rounded-xl text-sm font-medium text-white bg-gradient-to-br from-purple-600 to-purple-700 shadow-lg"
                  >
                    Primary
                  </button>
                  <button
                    type="button"
                    className="neu-btn neu-focus w-full py-3 px-6 rounded-xl text-sm font-medium text-white bg-gradient-to-br from-green-500 to-green-600 shadow-lg"
                  >
                    Success
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setLoading(true)
                      setTimeout(() => {
                        setLoading(false)
                        show("success", "Complete", "Loading finished!")
                      }, 2000)
                    }}
                    className="neu-raised neu-btn neu-focus w-full py-3 px-6 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="w-[18px] h-[18px] animate-spin" aria-hidden />
                    ) : null}
                    <span>{loading ? "Loading..." : "Click for Loading"}</span>
                  </button>
                </div>
              </article>

              {/* Toggles & checks */}
              <article className="neu-raised p-6 rounded-3xl">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-6 tracking-tight flex items-center gap-2">
                  <ToggleLeft className="w-5 h-5" aria-hidden />
                  Toggles & Checks
                </h2>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="notifications-toggle"
                      className="text-sm text-gray-600 dark:text-gray-300"
                    >
                      Enable notifications
                    </label>
                    <button
                      type="button"
                      role="switch"
                      id="notifications-toggle"
                      aria-checked={notificationsOn}
                      onClick={() => setNotificationsOn((v) => !v)}
                      className={`neu-focus w-14 h-8 rounded-full relative transition-all ${notificationsOn ? "bg-gradient-to-br from-purple-600 to-purple-700" : "neu-inset"}`}
                    >
                      <span
                        className="absolute top-1 w-6 h-6 rounded-full transition-all duration-300 neu-raised"
                        style={{ left: notificationsOn ? "calc(100% - 28px)" : "4px" }}
                        aria-hidden
                      />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={termsChecked}
                      onClick={() => setTermsChecked((v) => !v)}
                      className={`neu-focus w-6 h-6 rounded-lg flex items-center justify-center transition-all ${termsChecked ? "bg-gradient-to-br from-purple-600 to-purple-700" : "neu-inset"}`}
                    >
                      <Check
                        className={`w-3.5 h-3.5 text-white transition-opacity ${termsChecked ? "opacity-100" : "opacity-0"}`}
                        aria-hidden
                      />
                    </button>
                    <label
                      htmlFor="terms-checkbox"
                      className="text-sm text-gray-600 dark:text-gray-300 cursor-pointer"
                    >
                      Accept terms
                    </label>
                  </div>
                  <fieldset>
                    <legend className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                      Choose plan:
                    </legend>
                    <div
                      className="space-y-3"
                      role="radiogroup"
                      aria-label="Subscription plan"
                    >
                      {(["free", "pro"] as const).map((p) => (
                        <div key={p} className="flex items-center gap-3">
                          <button
                            type="button"
                            role="radio"
                            aria-checked={plan === p}
                            onClick={() => setPlan(p)}
                            className="neu-focus w-6 h-6 rounded-full flex items-center justify-center transition-all neu-inset"
                          >
                            <span
                              className={`w-3 h-3 rounded-full bg-gradient-to-br from-purple-600 to-purple-700 transition-opacity ${plan === p ? "opacity-100" : "opacity-0"}`}
                              aria-hidden
                            />
                          </button>
                          <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                            {p}
                          </span>
                        </div>
                      ))}
                    </div>
                  </fieldset>
                </div>
              </article>

              {/* Badges */}
              <article className="neu-raised p-6 rounded-3xl">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-6 tracking-tight flex items-center gap-2">
                  <Badge className="w-5 h-5" aria-hidden />
                  Badges
                </h2>
                <div className="flex flex-wrap gap-3">
                  <span className="px-4 py-2 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 neu-raised-sm">
                    Default
                  </span>
                  <span className="px-4 py-2 rounded-full text-xs font-medium text-white bg-gradient-to-br from-purple-600 to-purple-700 shadow-md">
                    Primary
                  </span>
                  <span className="px-4 py-2 rounded-full text-xs font-medium text-white bg-gradient-to-br from-green-500 to-green-600 shadow-md">
                    Success
                  </span>
                  <span className="px-4 py-2 rounded-full text-xs font-medium text-white bg-gradient-to-br from-yellow-500 to-yellow-600 shadow-md">
                    Warning
                  </span>
                  <span className="px-4 py-2 rounded-full text-xs font-medium text-white bg-gradient-to-br from-red-500 to-red-600 shadow-md">
                    Error
                  </span>
                  <span className="px-4 py-2 rounded-full text-xs font-medium text-white bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
                    Info
                  </span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-6 mb-4">
                  With Icons
                </h3>
                <div className="flex flex-wrap gap-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-green-700 bg-green-100 dark:bg-green-900 dark:text-green-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Active
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-yellow-700 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300">
                    <Clock className="w-3 h-3" aria-hidden />
                    Pending
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-300">
                    <X className="w-3 h-3" aria-hidden />
                    Closed
                  </span>
                </div>
              </article>

              {/* Tooltips */}
              <article className="neu-raised p-6 rounded-3xl">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-6 tracking-tight flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" aria-hidden />
                  Tooltips
                </h2>
                <div className="flex flex-wrap gap-3">
                  {[
                    { icon: Home, label: "Home" },
                    { icon: Settings, label: "Settings" },
                    { icon: Bell, label: "Notifications" },
                    { icon: User, label: "Profile" },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="relative neu-tooltip-container">
                      <button
                        type="button"
                        className="neu-raised neu-btn neu-focus p-3 rounded-xl"
                        aria-describedby={`tooltip-${label}`}
                      >
                        <Icon
                          className="w-5 h-5 text-gray-600 dark:text-gray-300"
                          aria-hidden
                        />
                        <span className="sr-only">{label}</span>
                      </button>
                      <div
                        id={`tooltip-${label}`}
                        role="tooltip"
                        className="neu-tooltip absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-gray-800 whitespace-nowrap pointer-events-none z-10"
                      >
                        {label}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              {/* Accordion */}
              <article className="neu-raised p-6 rounded-3xl md:col-span-2">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-6 tracking-tight flex items-center gap-2">
                  <ChevronsDown className="w-5 h-5" aria-hidden />
                  Accordion
                </h2>
                <div className="space-y-3">
                  {[
                    {
                      title: "What is neuromorphic design?",
                      body: "Neuromorphic design uses soft shadows and gradients to create a soft, extruded plastic look. It mimics real physical objects with subtle depth.",
                    },
                    {
                      title: "Is it accessible?",
                      body: "Yes! This implementation includes full keyboard navigation, ARIA attributes, and screen reader support.",
                    },
                    {
                      title: "Can I customize it?",
                      body: "Absolutely! All components are built with customization in mind. Colors, sizes, and animations can be easily modified.",
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="rounded-xl overflow-hidden neu-flat"
                    >
                      <button
                        type="button"
                        className="neu-focus w-full px-5 py-4 text-left flex items-center justify-between"
                        aria-expanded={accordionOpen[i]}
                        aria-controls={`accordion-panel-${i}`}
                        onClick={() => toggleAccordion(i)}
                      >
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                          {item.title}
                        </span>
                        <ChevronDown
                          className={`w-[18px] h-[18px] text-gray-500 transition-transform duration-300 ${accordionOpen[i] ? "rotate-180" : ""}`}
                          aria-hidden
                        />
                      </button>
                      <div
                        id={`accordion-panel-${i}`}
                        className="neu-accordion-panel px-5 transition-all duration-300"
                        style={{
                          maxHeight: accordionOpen[i] ? "200px" : "0",
                          overflow: "hidden",
                        }}
                      >
                        <p className="text-sm text-gray-500 dark:text-gray-400 pb-4">
                          {item.body}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>
        )}

        {/* ==================== FORMS PANEL ==================== */}
        {activeTab === 1 && (
          <section
            id="panel-forms"
            role="tabpanel"
            aria-labelledby="tab-forms"
            tabIndex={0}
            className="tab-panel"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <article className="neu-raised p-6 rounded-3xl">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-6 tracking-tight flex items-center gap-2">
                  <TextCursorInput className="w-5 h-5" aria-hidden />
                  Text Inputs
                </h2>
                <form onSubmit={handleContactSubmit} className="space-y-5" noValidate>
                  <div>
                    <label
                      htmlFor="name-input"
                      className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2"
                    >
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name-input"
                      name="name"
                      required
                      placeholder="John Doe"
                      autoComplete="name"
                      className="w-full px-4 py-3 rounded-xl text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 neu-inset bg-transparent"
                      aria-invalid={!!formErrors.name}
                    />
                    {formErrors.name && (
                      <p className="text-xs text-red-500 mt-1" role="alert">
                        {formErrors.name}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="email-input"
                      className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2"
                    >
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email-input"
                      name="email"
                      required
                      placeholder="john@example.com"
                      autoComplete="email"
                      className="w-full px-4 py-3 rounded-xl text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 neu-inset bg-transparent"
                      aria-invalid={!!formErrors.email}
                    />
                    {formErrors.email && (
                      <p className="text-xs text-red-500 mt-1" role="alert">
                        {formErrors.email}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="message-input"
                      className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2"
                    >
                      Message
                    </label>
                    <textarea
                      id="message-input"
                      name="message"
                      rows={3}
                      placeholder="Your message..."
                      className="w-full px-4 py-3 rounded-xl text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none neu-inset bg-transparent"
                    />
                  </div>
                  <button
                    type="submit"
                    className="neu-btn neu-focus w-full py-3 px-6 rounded-xl text-sm font-medium text-white bg-gradient-to-br from-purple-600 to-purple-700 shadow-lg"
                  >
                    Submit Form
                  </button>
                </form>
              </article>

              {/* Search dropdown */}
              <article className="neu-raised p-6 rounded-3xl">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-6 tracking-tight flex items-center gap-2">
                  <Search className="w-5 h-5" aria-hidden />
                  Search Dropdown
                </h2>
                <div className="relative">
                  <label
                    htmlFor="country-search"
                    className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2"
                  >
                    Select Country
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="country-search"
                      placeholder="Search countries..."
                      autoComplete="off"
                      value={countrySearch || selectedCountry}
                      onChange={(e) => {
                        setCountrySearch(e.target.value)
                        if (!e.target.value) setSelectedCountry("")
                      }}
                      onFocus={() => setCountryOpen(true)}
                      className="w-full px-4 py-3 pr-10 rounded-xl text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 neu-inset bg-transparent"
                      role="combobox"
                      aria-expanded={countryOpen}
                      aria-haspopup="listbox"
                      aria-controls="country-list"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                      <ChevronDown className="w-[18px] h-[18px]" aria-hidden />
                    </span>
                  </div>
                  <ul
                    id="country-list"
                    role="listbox"
                    aria-label="Countries"
                    className={`absolute z-20 w-full mt-2 rounded-xl overflow-hidden transition-all duration-200 neu-raised max-h-48 overflow-y-auto neu-custom-scrollbar ${countryOpen ? "opacity-100 visible" : "opacity-0 invisible"}`}
                  >
                    {filteredCountries.map((c) => (
                      <li
                        key={c.value}
                        role="option"
                        tabIndex={-1}
                        className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
                        onClick={() => {
                          setSelectedCountry(c.label)
                          setCountrySearch("")
                          setCountryOpen(false)
                          show("info", "Selected", c.label)
                        }}
                      >
                        {c.label}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Multi-select */}
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-6 mb-3">
                  Multi-Select
                </h3>
                <div className="relative">
                  <div
                    className="min-h-[48px] px-3 py-2 rounded-xl flex flex-wrap gap-2 items-center cursor-text neu-inset"
                    role="listbox"
                    aria-label="Selected skills"
                    aria-multiselectable
                    onClick={() => setMultiSelectOpen((o) => !o)}
                  >
                    {multiSelectSelected.length === 0 ? (
                      <span className="text-sm text-gray-400">Click to select...</span>
                    ) : (
                      multiSelectSelected.map((v) => {
                        const opt = MULTI_SELECT_OPTIONS.find((o) => o.value === v)
                        return (
                          <span
                            key={v}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-white bg-gradient-to-br from-purple-600 to-purple-700"
                          >
                            {opt?.label ?? v}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleMultiOption(v)
                              }}
                              className="hover:text-purple-200"
                              aria-label={`Remove ${opt?.label ?? v}`}
                            >
                              <X className="w-3 h-3" aria-hidden />
                            </button>
                          </span>
                        )
                      })
                    )}
                  </div>
                  <button
                    type="button"
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    aria-label="Toggle dropdown"
                    aria-expanded={multiSelectOpen}
                    onClick={(e) => {
                      e.stopPropagation()
                      setMultiSelectOpen((o) => !o)
                    }}
                  >
                    <ChevronDown className="w-[18px] h-[18px]" aria-hidden />
                  </button>
                  <ul
                    role="listbox"
                    aria-label="Available skills"
                    className={`absolute z-20 w-full mt-2 rounded-xl overflow-hidden transition-all duration-200 neu-raised max-h-48 overflow-y-auto neu-custom-scrollbar ${multiSelectOpen ? "opacity-100 visible" : "opacity-0 invisible"}`}
                  >
                    {MULTI_SELECT_OPTIONS.map((opt) => (
                      <li
                        key={opt.value}
                        role="option"
                        tabIndex={-1}
                        aria-selected={multiSelectSelected.includes(opt.value)}
                        className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors flex items-center gap-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleMultiOption(opt.value)
                        }}
                      >
                        <span
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center ${multiSelectSelected.includes(opt.value) ? "bg-purple-600 border-purple-600" : "border-gray-300 dark:border-gray-600"}`}
                        >
                          {multiSelectSelected.includes(opt.value) && (
                            <Check className="w-3 h-3 text-white" aria-hidden />
                          )}
                        </span>
                        {opt.label}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>

              {/* Range & rating */}
              <article className="neu-raised p-6 rounded-3xl">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-6 tracking-tight flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" aria-hidden />
                  Range & Rating
                </h2>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-3">
                      <label
                        htmlFor="volume-slider"
                        className="text-sm font-medium text-gray-600 dark:text-gray-300"
                      >
                        Volume
                      </label>
                      <span className="text-sm font-semibold text-purple-600">
                        {volume}%
                      </span>
                    </div>
                    <div className="relative h-3 rounded-full neu-inset">
                      <div
                        className="absolute h-full rounded-full neu-progress-fill transition-all"
                        style={{ width: `${volume}%` }}
                      />
                      <input
                        type="range"
                        id="volume-slider"
                        min={0}
                        max={100}
                        value={volume}
                        onChange={(e) => setVolume(Number(e.target.value))}
                        className="absolute w-full h-full opacity-0 cursor-pointer"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={volume}
                        aria-label="Volume"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3 block">
                      Rating
                    </label>
                    <div
                      className="flex gap-1"
                      role="radiogroup"
                      aria-label="Rating"
                    >
                      {[1, 2, 3, 4, 5].map((r) => (
                        <button
                          key={r}
                          type="button"
                          className="neu-focus p-1 rounded transition-transform hover:scale-110"
                          role="radio"
                          aria-checked={starRating >= r}
                          aria-label={`${r} star${r > 1 ? "s" : ""}`}
                          onClick={() => setStarRating(r)}
                          onMouseEnter={() => setHoverRating(r)}
                          onMouseLeave={() => setHoverRating(0)}
                        >
                          <span
                            className="text-2xl"
                            style={{
                              color:
                                (hoverRating || starRating) >= r
                                  ? "#f59e0b"
                                  : "#d1d5db",
                            }}
                          >
                            ★
                          </span>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {starRating
                        ? `You rated ${starRating} star${starRating > 1 ? "s" : ""}`
                        : "Click to rate"}
                    </p>
                  </div>
                </div>
              </article>

              {/* Date & time */}
              <article className="neu-raised p-6 rounded-3xl">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-6 tracking-tight flex items-center gap-2">
                  <CalendarClock className="w-5 h-5" aria-hidden />
                  Date & Time
                </h2>
                <div className="space-y-5">
                  <div>
                    <label
                      htmlFor="date-picker"
                      className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2"
                    >
                      Select Date
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        id="date-picker"
                        value={dateValue}
                        onChange={(e) => setDateValue(e.target.value)}
                        className="w-full px-4 py-3 pr-10 rounded-xl text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 neu-inset bg-transparent"
                        aria-label="Select a date"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        <Calendar className="w-[18px] h-[18px]" aria-hidden />
                      </span>
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="time-picker"
                      className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2"
                    >
                      Select Time
                    </label>
                    <div className="relative">
                      <input
                        type="time"
                        id="time-picker"
                        value={timeValue}
                        onChange={(e) => setTimeValue(e.target.value)}
                        className="w-full px-4 py-3 pr-10 rounded-xl text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 neu-inset bg-transparent"
                        aria-label="Select a time"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        <Clock className="w-[18px] h-[18px]" aria-hidden />
                      </span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl text-sm text-gray-600 dark:text-gray-300 neu-flat">
                    <Info className="inline-block w-4 h-4 mr-2 text-purple-500" aria-hidden />
                    {displayDate()}
                  </div>
                </div>
              </article>

              {/* File upload */}
              <article className="neu-raised p-6 rounded-3xl md:col-span-2 lg:col-span-3">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-6 tracking-tight flex items-center gap-2">
                  <UploadCloud className="w-5 h-5" aria-hidden />
                  File Upload
                </h2>
                <label
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer hover:border-purple-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 block"
                  role="button"
                  tabIndex={0}
                  aria-label="Drop files here or click to upload"
                >
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileChange}
                  />
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 neu-raised">
                      <CloudUpload
                        className="w-8 h-8 text-purple-500"
                        aria-hidden
                      />
                    </div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                      Drop files here or click to upload
                    </p>
                    <p className="text-xs text-gray-400">PNG, JPG, PDF up to 10MB</p>
                  </div>
                </label>
                <div className="mt-4 space-y-2" aria-live="polite">
                  {files.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-3 p-3 rounded-xl neu-raised"
                    >
                      <File className="w-5 h-5 text-purple-500 flex-shrink-0" aria-hidden />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                          {f.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {(f.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(f.id)}
                        className="p-1 text-gray-400 hover:text-red-500 rounded neu-focus"
                        aria-label={`Remove ${f.name}`}
                      >
                        <X className="w-4 h-4" aria-hidden />
                      </button>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>
        )}

        {/* ==================== FEEDBACK PANEL ==================== */}
        {activeTab === 2 && (
          <section
            id="panel-feedback"
            role="tabpanel"
            aria-labelledby="tab-feedback"
            tabIndex={0}
            className="tab-panel"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <article className="neu-raised p-6 rounded-3xl">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-6 tracking-tight flex items-center gap-2">
                  <Loader className="w-5 h-5" aria-hidden />
                  Progress
                </h2>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        Upload Progress
                      </span>
                      <span className="text-sm font-medium text-purple-600">
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <div
                      className="h-3 rounded-full overflow-hidden neu-inset"
                      role="progressbar"
                      aria-valuenow={Math.round(progress)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Upload progress"
                    >
                      <div
                        className="h-full rounded-full transition-all duration-300 relative overflow-hidden neu-progress-fill"
                        style={{ width: `${progress}%` }}
                      >
                        <div className="neu-shimmer absolute inset-0" />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={startProgress}
                      disabled={progressRunning}
                      className="neu-btn neu-focus flex-1 py-2 px-4 rounded-xl text-sm font-medium text-white bg-gradient-to-br from-green-500 to-green-600 shadow-md"
                    >
                      Start
                    </button>
                    <button
                      type="button"
                      onClick={resetProgress}
                      className="neu-raised neu-btn neu-focus flex-1 py-2 px-4 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </article>

              <article className="neu-raised p-6 rounded-3xl">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-6 tracking-tight flex items-center gap-2">
                  <Loader2Icon className="w-5 h-5" aria-hidden />
                  Loading States
                </h2>
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center neu-raised">
                      <Loader2 className="w-5 h-5 text-purple-500 animate-spin" aria-label="Loading" />
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Spinner
                    </span>
                  </div>
                  <div className="flex items-center gap-4" aria-label="Loading">
                    <div
                      className="w-2 h-2 rounded-full bg-purple-500 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="w-2 h-2 rounded-full bg-purple-500 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-2 h-2 rounded-full bg-purple-500 animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-300 block mb-3">
                      Skeleton
                    </span>
                    <div className="space-y-3" aria-label="Loading content">
                      <div
                        className="h-4 rounded-lg neu-skeleton"
                        style={{ width: "75%" }}
                      />
                      <div
                        className="h-4 rounded-lg neu-skeleton"
                        style={{ width: "100%" }}
                      />
                      <div
                        className="h-4 rounded-lg neu-skeleton"
                        style={{ width: "60%" }}
                      />
                    </div>
                  </div>
                </div>
              </article>

              <article className="neu-raised p-6 rounded-3xl">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-6 tracking-tight flex items-center gap-2">
                  <BellRing className="w-5 h-5" aria-hidden />
                  Notifications
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      show("success", "Success!", "Action completed successfully")
                    }
                    className="neu-btn neu-focus py-2 px-3 rounded-xl text-xs font-medium text-white bg-gradient-to-br from-green-500 to-green-600 shadow-md"
                  >
                    Success
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      show("error", "Error!", "Something went wrong")
                    }
                    className="neu-btn neu-focus py-2 px-3 rounded-xl text-xs font-medium text-white bg-gradient-to-br from-red-500 to-red-600 shadow-md"
                  >
                    Error
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      show("warning", "Warning!", "Please check your input")
                    }
                    className="neu-btn neu-focus py-2 px-3 rounded-xl text-xs font-medium text-white bg-gradient-to-br from-yellow-500 to-yellow-600 shadow-md"
                  >
                    Warning
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      show("info", "Info", "Here is some information")
                    }
                    className="neu-btn neu-focus py-2 px-3 rounded-xl text-xs font-medium text-white bg-gradient-to-br from-blue-500 to-blue-600 shadow-md"
                  >
                    Info
                  </button>
                </div>
              </article>

              <article className="neu-raised p-6 rounded-3xl">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-6 tracking-tight flex items-center gap-2">
                  <Layout className="w-5 h-5" aria-hidden />
                  Modal Dialog
                </h2>
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="neu-btn neu-focus w-full py-3 px-6 rounded-xl text-sm font-medium text-white bg-gradient-to-br from-purple-600 to-purple-700 shadow-lg"
                >
                  Open Modal
                </button>
              </article>

              <article className="neu-raised p-6 rounded-3xl md:col-span-2">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-6 tracking-tight flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" aria-hidden />
                  Alert Messages
                </h2>
                <div className="space-y-4">
                  <div
                    className="flex items-start gap-3 p-4 rounded-xl bg-green-100 dark:bg-green-900/30"
                    role="alert"
                  >
                    <CheckCircle2 className="text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0 w-5 h-5" aria-hidden />
                    <div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        Success
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        Your changes have been saved successfully.
                      </p>
                    </div>
                  </div>
                  <div
                    className="flex items-start gap-3 p-4 rounded-xl bg-red-100 dark:bg-red-900/30"
                    role="alert"
                  >
                    <XCircle className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0 w-5 h-5" aria-hidden />
                    <div>
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">
                        Error
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400">
                        There was a problem processing your request.
                      </p>
                    </div>
                  </div>
                  <div
                    className="flex items-start gap-3 p-4 rounded-xl bg-yellow-100 dark:bg-yellow-900/30"
                    role="alert"
                  >
                    <AlertTriangle className="text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0 w-5 h-5" aria-hidden />
                    <div>
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        Warning
                      </p>
                      <p className="text-xs text-yellow-600 dark:text-yellow-400">
                        Your session will expire in 5 minutes.
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </section>
        )}

        {/* ==================== DATA PANEL ==================== */}
        {activeTab === 3 && (
          <section
            id="panel-data"
            role="tabpanel"
            aria-labelledby="tab-data"
            tabIndex={0}
            className="tab-panel"
          >
            <div className="grid grid-cols-1 gap-8">
              <article className="neu-raised p-6 rounded-3xl">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-6 tracking-tight flex items-center gap-2">
                  <Table className="w-5 h-5" aria-hidden />
                  Data Table
                </h2>
                <div className="mb-4">
                  <div className="relative max-w-sm">
                    <input
                      type="text"
                      id="table-search"
                      placeholder="Search..."
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                      className="w-full px-4 py-2 pl-10 rounded-xl text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 neu-inset bg-transparent"
                      aria-label="Search table"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                      <Search className="w-4 h-4" aria-hidden />
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-xl neu-inset">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th
                          className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300"
                          scope="col"
                        >
                          Name
                        </th>
                        <th
                          className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300"
                          scope="col"
                        >
                          Email
                        </th>
                        <th
                          className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300"
                          scope="col"
                        >
                          Status
                        </th>
                        <th
                          className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300"
                          scope="col"
                        >
                          Role
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTableRows.map((row, i) => (
                        <tr
                          key={i}
                          className="border-b border-gray-100 dark:border-gray-700/50 last:border-0 hover:bg-white/30 dark:hover:bg-white/5 transition-colors"
                        >
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                            {row.name}
                          </td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                            {row.email}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                row.status === "Active"
                                  ? "text-green-700 bg-green-100 dark:bg-green-900/50 dark:text-green-300"
                                  : row.status === "Pending"
                                    ? "text-yellow-700 bg-yellow-100 dark:bg-yellow-900/50 dark:text-yellow-300"
                                    : "text-red-700 bg-red-100 dark:bg-red-900/50 dark:text-red-300"
                              }`}
                            >
                              {row.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                            {row.role}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="sr-only" aria-live="polite">
                  {filteredTableRows.length} result
                  {filteredTableRows.length !== 1 ? "s" : ""} found
                </p>
              </article>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <article className="neu-raised p-6 rounded-3xl">
                  <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-6 tracking-tight flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" aria-hidden />
                    Bar Chart
                  </h2>
                  <div
                    className="flex items-end justify-between h-48 gap-4 px-4"
                    role="img"
                    aria-label="Weekly activity chart"
                  >
                    {[60, 80, 45, 90, 70, 55, 35].map((h, i) => (
                      <div
                        key={i}
                        className="flex flex-col items-center gap-2 flex-1"
                      >
                        <div
                          className="w-full rounded-t-lg neu-chart-bar bg-gradient-to-t from-purple-700 to-purple-500"
                          style={{ height: `${h}%` }}
                        />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}
                        </span>
                      </div>
                    ))}
                  </div>
                </article>
                <article className="neu-raised p-6 rounded-3xl">
                  <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-6 tracking-tight flex items-center gap-2">
                    <PieChart className="w-5 h-5" aria-hidden />
                    Donut Chart
                  </h2>
                  <div
                    className="flex items-center justify-center"
                    role="img"
                    aria-label="Device usage: Desktop 50%, Mobile 30%, Tablet 20%"
                  >
                    <div className="relative w-40 h-40">
                      <svg
                        viewBox="0 0 100 100"
                        className="w-full h-full -rotate-90"
                        aria-hidden
                      >
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="12"
                          className="text-gray-200 dark:text-gray-700"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="url(#neu-grad1)"
                          strokeWidth="12"
                          strokeDasharray="125.6 251.2"
                          strokeLinecap="round"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="url(#neu-grad2)"
                          strokeWidth="12"
                          strokeDasharray="75.4 251.2"
                          strokeDashoffset="-125.6"
                          strokeLinecap="round"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="url(#neu-grad3)"
                          strokeWidth="12"
                          strokeDasharray="50.2 251.2"
                          strokeDashoffset="-201"
                          strokeLinecap="round"
                        />
                        <defs>
                          <linearGradient
                            id="neu-grad1"
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="0%"
                          >
                            <stop offset="0%" stopColor="#7c3aed" />
                            <stop offset="100%" stopColor="#a855f7" />
                          </linearGradient>
                          <linearGradient
                            id="neu-grad2"
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="0%"
                          >
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#34d399" />
                          </linearGradient>
                          <linearGradient
                            id="neu-grad3"
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="0%"
                          >
                            <stop offset="0%" stopColor="#f59e0b" />
                            <stop offset="100%" stopColor="#fbbf24" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-semibold text-gray-700 dark:text-gray-200">
                          100%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center gap-6 mt-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-600 to-purple-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Desktop 50%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 to-green-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Mobile 30%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Tablet 20%
                      </span>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </section>
        )}

        {/* ==================== ADVANCED PANEL ==================== */}
        {activeTab === 4 && (
          <section
            id="panel-advanced"
            role="tabpanel"
            aria-labelledby="tab-advanced"
            tabIndex={0}
            className="tab-panel"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <article className="neu-raised p-6 rounded-3xl">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-6 tracking-tight flex items-center gap-2">
                  <ChevronsRight className="w-5 h-5" aria-hidden />
                  Breadcrumbs
                </h2>
                <nav aria-label="Breadcrumb">
                  <ol className="flex items-center gap-2 text-sm flex-wrap">
                    <li>
                      <a
                        href="#"
                        className="text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors neu-focus rounded"
                      >
                        Home
                      </a>
                    </li>
                    <li aria-hidden>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    </li>
                    <li>
                      <a
                        href="#"
                        className="text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors neu-focus rounded"
                      >
                        Products
                      </a>
                    </li>
                    <li aria-hidden>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    </li>
                    <li>
                      <span
                        className="text-gray-700 dark:text-gray-200 font-medium"
                        aria-current="page"
                      >
                        Details
                      </span>
                    </li>
                  </ol>
                </nav>
              </article>

              <article className="neu-raised p-6 rounded-3xl md:col-span-2">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-6 tracking-tight flex items-center gap-2">
                  <GitBranch className="w-5 h-5" aria-hidden />
                  Stepper
                </h2>
                <div
                  className="flex items-center justify-between"
                  role="list"
                  aria-label="Progress steps"
                >
                  <div className="flex items-center gap-3" role="listitem">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium bg-gradient-to-br from-purple-600 to-purple-700 shadow-md"
                      aria-label="Step 1, completed"
                    >
                      <Check className="w-[18px] h-[18px]" aria-hidden />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:block">
                      Account
                    </span>
                  </div>
                  <div
                    className="flex-1 h-1 mx-4 rounded-full bg-gradient-to-r from-purple-600 to-purple-700"
                    aria-hidden
                  />
                  <div className="flex items-center gap-3" role="listitem">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium bg-gradient-to-br from-purple-600 to-purple-700 shadow-md"
                      aria-label="Step 2, current"
                    >
                      2
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:block">
                      Details
                    </span>
                  </div>
                  <div
                    className="flex-1 h-1 mx-4 rounded-full neu-inset"
                    aria-hidden
                  />
                  <div className="flex items-center gap-3" role="listitem">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm font-medium neu-raised"
                      aria-label="Step 3, pending"
                    >
                      3
                    </div>
                    <span className="text-sm text-gray-400 dark:text-gray-500 hidden sm:block">
                      Confirm
                    </span>
                  </div>
                </div>
              </article>

              <article className="neu-raised p-6 rounded-3xl">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-6 tracking-tight flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5" aria-hidden />
                  Feature Cards
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: Zap, label: "Fast", gradient: "from-purple-600 to-purple-700" },
                    { icon: ShieldCheck, label: "Secure", gradient: "from-green-500 to-green-600" },
                    { icon: Sparkles, label: "Modern", gradient: "from-yellow-500 to-yellow-600" },
                    { icon: Globe, label: "Global", gradient: "from-blue-500 to-blue-600" },
                  ].map(({ icon: Icon, label, gradient }) => (
                    <div
                      key={label}
                      className="neu-flat p-4 rounded-xl text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div
                        className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center bg-gradient-to-br ${gradient} shadow-md`}
                      >
                        <Icon className="text-white w-6 h-6" aria-hidden />
                      </div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="neu-raised p-6 rounded-3xl">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-6 tracking-tight flex items-center gap-2">
                  <MousePointer2 className="w-5 h-5" aria-hidden />
                  Context Menu
                </h2>
                <div
                  ref={contextAreaRef}
                  onContextMenu={handleContextMenu}
                  tabIndex={0}
                  role="application"
                  aria-label="Right-click or press Menu key for context menu"
                  className="h-32 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 cursor-context-menu transition-colors hover:border-purple-400 focus:border-purple-400 focus:outline-none"
                >
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center px-4">
                    Right-click here
                    <br />
                    <span className="text-xs">(or press Menu key)</span>
                  </p>
                </div>
              </article>

              <article className="neu-raised p-6 rounded-3xl">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-6 tracking-tight flex items-center gap-2">
                  <FolderTree className="w-5 h-5" aria-hidden />
                  Tree View
                </h2>
                <nav aria-label="File tree navigation">
                  <ul role="tree" aria-label="Project files" className="space-y-1">
                    <li
                      role="treeitem"
                      aria-expanded={treeExpanded.src}
                      className="tree-item"
                    >
                      <button
                        type="button"
                        className="neu-focus w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors text-left"
                        aria-expanded={treeExpanded.src}
                        onClick={() =>
                          setTreeExpanded((p) => ({ ...p, src: !p.src }))
                        }
                      >
                        <ChevronRight
                          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${treeExpanded.src ? "rotate-90" : ""}`}
                          aria-hidden
                        />
                        {treeExpanded.src ? (
                          <FolderOpen className="w-[18px] h-[18px] text-yellow-500" aria-hidden />
                        ) : (
                          <Folder className="w-[18px] h-[18px] text-yellow-500" aria-hidden />
                        )}
                        <span>src</span>
                      </button>
                      {treeExpanded.src && (
                        <ul role="group" className="pl-6 mt-1 space-y-1">
                          <li
                            role="treeitem"
                            aria-expanded={treeExpanded.components}
                            className="tree-item"
                          >
                            <button
                              type="button"
                              className="neu-focus w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors text-left"
                              aria-expanded={treeExpanded.components}
                              onClick={() =>
                                setTreeExpanded((p) => ({
                                  ...p,
                                  components: !p.components,
                                }))
                              }
                            >
                              <ChevronRight
                                className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${treeExpanded.components ? "rotate-90" : ""}`}
                                aria-hidden
                              />
                              <Folder className="w-[18px] h-[18px] text-yellow-500" aria-hidden />
                              <span>components</span>
                            </button>
                            {treeExpanded.components && (
                              <ul role="group" className="pl-6 mt-1 space-y-1">
                                {["Button.tsx", "Modal.tsx", "Card.tsx"].map((name) => (
                                  <li key={name} role="treeitem" className="tree-leaf">
                                    <div
                                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors cursor-pointer"
                                      onClick={() =>
                                        show("info", "File Selected", name)
                                      }
                                    >
                                      <span className="w-[14px]" />
                                      <FileCode className="w-[18px] h-[18px] text-blue-500" aria-hidden />
                                      <span>{name}</span>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                          <li role="treeitem" className="tree-leaf">
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors cursor-pointer">
                              <span className="w-[14px]" />
                              <FileCode className="w-[18px] h-[18px] text-blue-500" aria-hidden />
                              <span>App.tsx</span>
                            </div>
                          </li>
                          <li role="treeitem" className="tree-leaf">
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors cursor-pointer">
                              <span className="w-[14px]" />
                              <File className="w-[18px] h-[18px] text-green-500" aria-hidden />
                              <span>index.ts</span>
                            </div>
                          </li>
                        </ul>
                      )}
                    </li>
                    <li role="treeitem" className="tree-leaf">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors cursor-pointer">
                        <span className="w-[14px]" />
                        <FileJson className="w-[18px] h-[18px] text-orange-500" aria-hidden />
                        <span>package.json</span>
                      </div>
                    </li>
                    <li role="treeitem" className="tree-leaf">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors cursor-pointer">
                        <span className="w-[14px]" />
                        <FileText className="w-[18px] h-[18px] text-gray-500" aria-hidden />
                        <span>README.md</span>
                      </div>
                    </li>
                  </ul>
                </nav>
              </article>
            </div>
          </section>
        )}
      </main>

      {/* Modal backdrop */}
      <div
        className={`fixed inset-0 z-40 neu-modal-backdrop transition-all duration-300 ${modalOpen ? "opacity-100 visible" : "opacity-0 invisible"}`}
        aria-hidden={!modalOpen}
        onClick={() => setModalOpen(false)}
      />

      {/* Modal dialog */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
        className={`fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md mx-4 p-6 rounded-3xl transition-all duration-300 neu-raised ${modalOpen ? "opacity-100 visible scale-100" : "opacity-0 invisible scale-95"}`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="modal-title" className="text-lg font-semibold text-gray-700 dark:text-gray-200">
            Modal Title
          </h2>
          <button
            type="button"
            onClick={() => setModalOpen(false)}
            className="neu-raised neu-btn neu-focus p-2 rounded-lg"
            aria-label="Close modal"
          >
            <X className="w-[18px] h-[18px] text-gray-500 dark:text-gray-400" aria-hidden />
          </button>
        </div>
        <p id="modal-description" className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          This is a beautiful neuromorphic modal dialog with smooth animations and full
          accessibility support. Press Escape to close.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setModalOpen(false)}
            className="neu-raised neu-btn neu-focus flex-1 py-2 px-4 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              show("success", "Confirmed!", "Your action has been confirmed")
              setModalOpen(false)
            }}
            className="neu-btn neu-focus flex-1 py-2 px-4 rounded-xl text-sm font-medium text-white bg-gradient-to-br from-purple-600 to-purple-700 shadow-md"
          >
            Confirm
          </button>
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden
            onClick={() => setContextMenu(null)}
          />
          <div
            role="menu"
            aria-label="Context menu"
            className="fixed z-50 py-2 min-w-40 neu-raised rounded-xl transition-all duration-200"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              type="button"
              role="menuitem"
              className="context-menu-item w-full px-4 py-2 text-left text-sm text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 flex items-center gap-2 focus:outline-none"
              onClick={() => {
                show("info", "Action", "Copy clicked")
                setContextMenu(null)
              }}
            >
              <Copy className="w-3.5 h-3.5" aria-hidden />
              Copy
            </button>
            <button
              type="button"
              role="menuitem"
              className="context-menu-item w-full px-4 py-2 text-left text-sm text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 flex items-center gap-2 focus:outline-none"
              onClick={() => {
                show("info", "Action", "Cut clicked")
                setContextMenu(null)
              }}
            >
              <Scissors className="w-3.5 h-3.5" aria-hidden />
              Cut
            </button>
            <button
              type="button"
              role="menuitem"
              className="context-menu-item w-full px-4 py-2 text-left text-sm text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 flex items-center gap-2 focus:outline-none"
              onClick={() => {
                show("info", "Action", "Paste clicked")
                setContextMenu(null)
              }}
            >
              <Clipboard className="w-3.5 h-3.5" aria-hidden />
              Paste
            </button>
            <div
              className="border-t border-gray-200 dark:border-gray-700 my-1"
              role="separator"
            />
            <button
              type="button"
              role="menuitem"
              className="context-menu-item w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2 focus:outline-none"
              onClick={() => {
                show("info", "Action", "Delete clicked")
                setContextMenu(null)
              }}
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}
