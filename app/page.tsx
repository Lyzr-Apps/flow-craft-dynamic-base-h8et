'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import parseLLMJson from '@/lib/jsonParser'
import { getDocuments, uploadAndTrainDocument, deleteDocuments } from '@/lib/ragKnowledgeBase'
import { copyToClipboard } from '@/lib/clipboard'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

import { Home, Plus, Settings, Eye, Trash2, Loader2, Sparkles, FileText, Image, ArrowLeft, RefreshCw, Upload, Check, X, Edit, Copy, Download, ExternalLink, Star, Clock, Filter, BarChart3, BookOpen, Globe, PenTool, AlertCircle, CheckCircle, Grid, Menu, ChevronLeft, Search } from 'lucide-react'

// ============================================================================
// Constants
// ============================================================================
const MANAGER_AGENT_ID = '6998726eafc03b530a027602'
const IMAGE_AGENT_ID = '69987280287fc1efe03969df'
const RAG_ID = '699871fee12ce168202ebc9c'

const STORAGE_KEY = 'solutionmots_articles'

// ============================================================================
// Types
// ============================================================================
interface Article {
  id: string
  query: string
  title: string
  meta_title: string
  meta_description: string
  slug_img: string
  article_html: string
  total_score: number
  evaluation_summary: string
  changes_made: string
  image_url: string | null
  image_description: string | null
  image_prompt_used: string | null
  status: 'draft' | 'published' | 'pending'
  created_at: string
}

interface StatusMessage {
  type: 'success' | 'error' | 'info'
  text: string
}

type Screen = 'dashboard' | 'new-article' | 'review' | 'knowledge-base'

interface RAGDoc {
  id?: string
  fileName: string
  fileType: string
  fileSize?: number
  status?: string
  uploadedAt?: string
}

// ============================================================================
// Sample Data
// ============================================================================
const SAMPLE_ARTICLES: Article[] = [
  {
    id: 'sample-1',
    query: 'zebres bipedes',
    title: 'Zebres Bipedes : Definition et Solutions de Mots Croises',
    meta_title: 'Zebres Bipedes - Solutions Mots Croises | SolutionMots',
    meta_description: 'Decouvrez la definition et les solutions pour la definition de mots croises "zebres bipedes". Trouvez la reponse a cette enigme facilement.',
    slug_img: 'zebres-bipedes',
    article_html: '<h2>Zebres Bipedes : Comprendre la Definition</h2><p>La definition "zebres bipedes" est une reference humoristique souvent rencontree dans les mots croises francophones. Elle designe des <strong>arbitres</strong> de football, en raison de leur maillot raye noir et blanc rappelant le pelage du zebre.</p><h3>Solutions Possibles</h3><ul><li><strong>ARBITRES</strong> (8 lettres) - La solution la plus courante</li><li><strong>REFS</strong> (4 lettres) - Forme abregee</li></ul><h3>Explications</h3><p>Cette definition joue sur le double sens du mot "zebre" utilise de maniere metaphorique pour decrire les arbitres sportifs qui portent traditionnellement des maillots rayes.</p>',
    total_score: 87,
    evaluation_summary: 'Article de haute qualite avec une bonne structure SEO, des explications claires et un contenu pertinent pour les amateurs de mots croises.',
    changes_made: 'Ajout de balises HTML semantiques, amelioration de la meta description, renforcement des mots-cles principaux dans le contenu.',
    image_url: null,
    image_description: null,
    image_prompt_used: null,
    status: 'draft',
    created_at: '2025-01-18T10:30:00.000Z',
  },
  {
    id: 'sample-2',
    query: 'capitale scandinave',
    title: 'Capitale Scandinave : Solutions de Mots Croises',
    meta_title: 'Capitale Scandinave - Reponses Mots Croises | SolutionMots',
    meta_description: 'Trouvez toutes les solutions pour "capitale scandinave" dans vos mots croises. Oslo, Stockholm, Copenhague et plus.',
    slug_img: 'capitale-scandinave',
    article_html: '<h2>Capitale Scandinave en Mots Croises</h2><p>La definition "capitale scandinave" revient frequemment dans les grilles de mots croises. Plusieurs reponses sont possibles selon le nombre de lettres demande.</p><h3>Solutions par Nombre de Lettres</h3><ul><li><strong>OSLO</strong> (4 lettres) - Capitale de la Norvege</li><li><strong>STOCKHOLM</strong> (9 lettres) - Capitale de la Suede</li><li><strong>COPENHAGUE</strong> (10 lettres) - Capitale du Danemark</li></ul>',
    total_score: 92,
    evaluation_summary: 'Excellent article avec une couverture exhaustive des solutions possibles. Structure claire et optimisee pour le SEO.',
    changes_made: 'Amelioration de la hierarchie des titres, ajout de details geographiques, optimisation des meta-donnees.',
    image_url: null,
    image_description: null,
    image_prompt_used: null,
    status: 'published',
    created_at: '2025-01-16T14:15:00.000Z',
  },
  {
    id: 'sample-3',
    query: 'fruit tropical',
    title: 'Fruit Tropical : Toutes les Solutions de Mots Croises',
    meta_title: 'Fruit Tropical - Solutions Mots Croises | SolutionMots',
    meta_description: 'Liste complete des fruits tropicaux pour vos grilles de mots croises. Mangue, papaye, litchi et bien d\'autres.',
    slug_img: 'fruit-tropical',
    article_html: '<h2>Fruit Tropical en Mots Croises</h2><p>Les fruits tropicaux sont parmi les definitions les plus variees dans les mots croises, offrant de nombreuses solutions possibles.</p><h3>Solutions Courantes</h3><ul><li><strong>MANGUE</strong> (6 lettres)</li><li><strong>PAPAYE</strong> (6 lettres)</li><li><strong>LITCHI</strong> (6 lettres)</li><li><strong>ANANAS</strong> (6 lettres)</li><li><strong>GOYAVE</strong> (6 lettres)</li></ul>',
    total_score: 74,
    evaluation_summary: 'Bon article mais pourrait beneficier de descriptions plus detaillees pour chaque fruit.',
    changes_made: 'Ajout de mots-cles secondaires, restructuration des listes, amelioration du maillage interne.',
    image_url: null,
    image_description: null,
    image_prompt_used: null,
    status: 'pending',
    created_at: '2025-01-15T09:45:00.000Z',
  },
]

// ============================================================================
// Utility Helpers
// ============================================================================
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30'
  if (score >= 60) return 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30'
  return 'bg-red-600/20 text-red-400 border-red-600/30'
}

function getScoreRingColor(score: number): string {
  if (score >= 80) return 'text-emerald-400'
  if (score >= 60) return 'text-yellow-400'
  return 'text-red-400'
}

function getStatusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case 'published':
      return { label: 'Published', className: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30' }
    case 'pending':
      return { label: 'Pending', className: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30' }
    default:
      return { label: 'Draft', className: 'bg-muted text-muted-foreground border-border' }
  }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return ''
  }
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## '))
          return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# '))
          return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* '))
          return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line))
          return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
  )
}

// ============================================================================
// Circular Score Component
// ============================================================================
function ScoreCircle({ score, size = 100 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference
  const colorClass = getScoreRingColor(score)

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(30 8% 20%)" strokeWidth="6" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className={cn('transition-all duration-1000', colorClass)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-2xl font-bold', colorClass)}>{score}</span>
        <span className="text-[10px] text-muted-foreground">/100</span>
      </div>
    </div>
  )
}

// ============================================================================
// Generation Progress Component
// ============================================================================
function GenerationProgress({ stage }: { stage: number }) {
  const stages = [
    { icon: <PenTool className="h-4 w-4" />, label: 'Writing article...' },
    { icon: <BarChart3 className="h-4 w-4" />, label: 'Evaluating quality...' },
    { icon: <Sparkles className="h-4 w-4" />, label: 'Improving content...' },
  ]

  return (
    <div className="space-y-4 py-8 max-w-sm mx-auto">
      {stages.map((s, i) => {
        const isActive = i === stage
        const isComplete = i < stage
        return (
          <div key={i} className={cn('flex items-center gap-3 p-3 rounded-lg transition-all duration-300', isActive ? 'bg-primary/10 border border-primary/30' : isComplete ? 'opacity-60' : 'opacity-30')}>
            <div className={cn('flex items-center justify-center w-8 h-8 rounded-full transition-all', isActive ? 'bg-primary text-primary-foreground' : isComplete ? 'bg-emerald-600/20 text-emerald-400' : 'bg-muted text-muted-foreground')}>
              {isComplete ? <Check className="h-4 w-4" /> : isActive ? <Loader2 className="h-4 w-4 animate-spin" /> : s.icon}
            </div>
            <span className={cn('text-sm font-medium', isActive ? 'text-foreground' : 'text-muted-foreground')}>{s.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// Crossword Grid Icon (Branding)
// ============================================================================
function CrosswordIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="text-primary">
      <rect x="2" y="2" width="6" height="6" rx="1" fill="currentColor" opacity="0.8" />
      <rect x="9" y="2" width="6" height="6" rx="1" fill="currentColor" opacity="0.4" />
      <rect x="16" y="2" width="6" height="6" rx="1" fill="currentColor" opacity="0.8" />
      <rect x="2" y="9" width="6" height="6" rx="1" fill="currentColor" opacity="0.4" />
      <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" opacity="0.9" />
      <rect x="16" y="9" width="6" height="6" rx="1" fill="currentColor" opacity="0.4" />
      <rect x="2" y="16" width="6" height="6" rx="1" fill="currentColor" opacity="0.8" />
      <rect x="9" y="16" width="6" height="6" rx="1" fill="currentColor" opacity="0.4" />
      <rect x="16" y="16" width="6" height="6" rx="1" fill="currentColor" opacity="0.8" />
    </svg>
  )
}

// ============================================================================
// Status Message Component
// ============================================================================
function InlineStatus({ message, onDismiss }: { message: StatusMessage; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  const icon = message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : message.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />
  const variant = message.type === 'error' ? 'destructive' as const : 'default' as const

  return (
    <Alert variant={variant} className={cn('mb-4', message.type === 'success' && 'border-emerald-600/30 bg-emerald-600/10', message.type === 'info' && 'border-primary/30 bg-primary/10')}>
      {icon}
      <AlertDescription className="flex items-center justify-between">
        <span>{message.text}</span>
        <button onClick={onDismiss} className="ml-2 opacity-60 hover:opacity-100">
          <X className="h-3 w-3" />
        </button>
      </AlertDescription>
    </Alert>
  )
}

// ============================================================================
// ErrorBoundary
// ============================================================================
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button onClick={() => this.setState({ hasError: false, error: '' })} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ============================================================================
// Main Page
// ============================================================================
export default function Page() {
  // --- Navigation ---
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // --- Articles State ---
  const [articles, setArticles] = useState<Article[]>([])
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null)
  const [dashboardFilter, setDashboardFilter] = useState<'all' | 'draft' | 'published' | 'pending'>('all')

  // --- New Article State ---
  const [query, setQuery] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genStage, setGenStage] = useState(0)

  // --- Review State ---
  const [editingHtml, setEditingHtml] = useState(false)
  const [editHtmlContent, setEditHtmlContent] = useState('')
  const [editingMeta, setEditingMeta] = useState(false)
  const [metaForm, setMetaForm] = useState({ title: '', meta_title: '', meta_description: '', slug_img: '' })
  const [generatingImage, setGeneratingImage] = useState(false)

  // --- KB State ---
  const [kbDocs, setKbDocs] = useState<RAGDoc[]>([])
  const [kbLoading, setKbLoading] = useState(false)
  const [kbUploading, setKbUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- Status ---
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  // --- Sample Data Toggle ---
  const [showSample, setShowSample] = useState(false)

  // --- Hydration guard for localStorage date ---
  const [mounted, setMounted] = useState(false)

  // Load articles from localStorage on mount
  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setArticles(parsed)
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [])

  // Save articles to localStorage
  useEffect(() => {
    if (mounted) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(articles))
      } catch {
        // Ignore
      }
    }
  }, [articles, mounted])

  // Stage cycling during generation
  useEffect(() => {
    if (!generating) return
    setGenStage(0)
    const t1 = setTimeout(() => setGenStage(1), 8000)
    const t2 = setTimeout(() => setGenStage(2), 16000)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [generating])

  // Derived data
  const displayArticles = showSample ? SAMPLE_ARTICLES : articles
  const filteredArticles = dashboardFilter === 'all' ? displayArticles : displayArticles.filter(a => a.status === dashboardFilter)
  const currentArticle: Article | null = showSample
    ? SAMPLE_ARTICLES.find(a => a.id === selectedArticleId) ?? null
    : articles.find(a => a.id === selectedArticleId) ?? null

  // --- Handlers ---
  const showStatus = useCallback((type: StatusMessage['type'], text: string) => {
    setStatusMessage({ type, text })
  }, [])

  const handleGenerateArticle = useCallback(async () => {
    if (!query.trim()) {
      showStatus('error', 'Please enter a crossword clue query.')
      return
    }
    setGenerating(true)
    setActiveAgentId(MANAGER_AGENT_ID)

    try {
      const result = await callAIAgent(query.trim(), MANAGER_AGENT_ID)

      if (result.success && result.response?.status === 'success') {
        const raw = result.response?.result
        const parsed = parseLLMJson(raw)

        const articleHtml = parsed?.improved_article_html ?? parsed?.article_html ?? ''
        const title = parsed?.title ?? query.trim()
        const metaTitle = parsed?.meta_title ?? title
        const metaDesc = parsed?.meta_description ?? ''
        const slugImg = parsed?.slug_img ?? ''
        const totalScore = typeof parsed?.total_score === 'number' ? parsed.total_score : 0
        const evalSummary = parsed?.evaluation_summary ?? ''
        const changesMade = parsed?.changes_made ?? ''

        const newId = generateId()

        const newArticle: Article = {
          id: newId,
          query: query.trim(),
          title,
          meta_title: metaTitle,
          meta_description: metaDesc,
          slug_img: slugImg,
          article_html: articleHtml,
          total_score: totalScore,
          evaluation_summary: evalSummary,
          changes_made: changesMade,
          image_url: null,
          image_description: null,
          image_prompt_used: null,
          status: 'draft',
          created_at: new Date().toISOString(),
        }

        setArticles(prev => [newArticle, ...prev])
        setSelectedArticleId(newId)
        setQuery('')
        setCurrentScreen('review')
        showStatus('success', 'Article generated successfully!')
      } else {
        const errMsg = result.error ?? result.response?.message ?? 'Failed to generate article.'
        showStatus('error', errMsg)
      }
    } catch {
      showStatus('error', 'An unexpected error occurred during generation.')
    } finally {
      setGenerating(false)
      setActiveAgentId(null)
    }
  }, [query, showStatus])

  const handleGenerateImage = useCallback(async () => {
    if (!currentArticle) return
    setGeneratingImage(true)
    setActiveAgentId(IMAGE_AGENT_ID)

    try {
      const message = `Generate a featured image for the crossword article: "${currentArticle.title}". The slug is: ${currentArticle.slug_img}`
      const result = await callAIAgent(message, IMAGE_AGENT_ID)

      if (result.success) {
        const parsed = parseLLMJson(result.response?.result)
        const imageUrl = result.module_outputs?.artifact_files?.[0]?.file_url ?? ''
        const imageDesc = parsed?.image_description ?? ''
        const imagePrompt = parsed?.image_prompt_used ?? ''

        if (imageUrl) {
          const artId = currentArticle.id
          setArticles(prev =>
            prev.map(a =>
              a.id === artId
                ? { ...a, image_url: imageUrl, image_description: imageDesc, image_prompt_used: imagePrompt }
                : a
            )
          )
          showStatus('success', 'Featured image generated!')
        } else {
          showStatus('error', 'Image generation completed but no image URL was returned.')
        }
      } else {
        showStatus('error', result.error ?? 'Image generation failed.')
      }
    } catch {
      showStatus('error', 'An unexpected error occurred during image generation.')
    } finally {
      setGeneratingImage(false)
      setActiveAgentId(null)
    }
  }, [currentArticle, showStatus])

  const handleRegenerateArticle = useCallback(() => {
    if (!currentArticle) return
    setQuery(currentArticle.query)
    setCurrentScreen('new-article')
  }, [currentArticle])

  const handleDeleteArticle = useCallback((id: string) => {
    setArticles(prev => prev.filter(a => a.id !== id))
    if (selectedArticleId === id) {
      setSelectedArticleId(null)
      setCurrentScreen('dashboard')
    }
    showStatus('info', 'Article deleted.')
  }, [selectedArticleId, showStatus])

  const handleViewArticle = useCallback((id: string) => {
    setSelectedArticleId(id)
    setEditingHtml(false)
    setEditingMeta(false)
    setCurrentScreen('review')
  }, [])

  const handleSaveMeta = useCallback(() => {
    if (!currentArticle) return
    const artId = currentArticle.id
    setArticles(prev =>
      prev.map(a =>
        a.id === artId
          ? { ...a, title: metaForm.title, meta_title: metaForm.meta_title, meta_description: metaForm.meta_description, slug_img: metaForm.slug_img }
          : a
      )
    )
    setEditingMeta(false)
    showStatus('success', 'Metadata saved.')
  }, [currentArticle, metaForm, showStatus])

  const handleSaveHtml = useCallback(() => {
    if (!currentArticle) return
    const artId = currentArticle.id
    setArticles(prev =>
      prev.map(a =>
        a.id === artId
          ? { ...a, article_html: editHtmlContent }
          : a
      )
    )
    setEditingHtml(false)
    showStatus('success', 'Article content saved.')
  }, [currentArticle, editHtmlContent, showStatus])

  const handlePublish = useCallback(() => {
    if (!currentArticle) return
    const artId = currentArticle.id
    setArticles(prev =>
      prev.map(a =>
        a.id === artId
          ? { ...a, status: 'published' as const }
          : a
      )
    )
    showStatus('success', 'Article marked as published!')
  }, [currentArticle, showStatus])

  const handleCopyHtml = useCallback(async () => {
    if (!currentArticle?.article_html) return
    const success = await copyToClipboard(currentArticle.article_html)
    if (success) {
      showStatus('success', 'HTML copied to clipboard.')
    } else {
      showStatus('error', 'Failed to copy to clipboard.')
    }
  }, [currentArticle, showStatus])

  // KB handlers
  const handleLoadDocs = useCallback(async () => {
    setKbLoading(true)
    try {
      const result = await getDocuments(RAG_ID)
      if (result.success && Array.isArray(result.documents)) {
        setKbDocs(result.documents.map(d => ({
          id: d.id,
          fileName: d.fileName,
          fileType: d.fileType,
          fileSize: d.fileSize,
          status: d.status,
          uploadedAt: d.uploadedAt,
        })))
      } else {
        showStatus('error', result.error ?? 'Failed to load documents.')
      }
    } catch {
      showStatus('error', 'Error loading knowledge base documents.')
    } finally {
      setKbLoading(false)
    }
  }, [showStatus])

  const handleUploadDoc = useCallback(async (file: File) => {
    setKbUploading(true)
    try {
      const result = await uploadAndTrainDocument(RAG_ID, file)
      if (result.success) {
        showStatus('success', `"${file.name}" uploaded and training started.`)
        await handleLoadDocs()
      } else {
        showStatus('error', result.error ?? 'Upload failed.')
      }
    } catch {
      showStatus('error', 'Error uploading document.')
    } finally {
      setKbUploading(false)
    }
  }, [showStatus, handleLoadDocs])

  const handleDeleteDoc = useCallback(async (fileName: string) => {
    setKbLoading(true)
    try {
      const result = await deleteDocuments(RAG_ID, [fileName])
      if (result.success) {
        showStatus('success', `"${fileName}" deleted.`)
        setKbDocs(prev => prev.filter(d => d.fileName !== fileName))
      } else {
        showStatus('error', result.error ?? 'Delete failed.')
      }
    } catch {
      showStatus('error', 'Error deleting document.')
    } finally {
      setKbLoading(false)
    }
  }, [showStatus])

  // Load KB docs when switching to KB screen
  useEffect(() => {
    if (currentScreen === 'knowledge-base') {
      handleLoadDocs()
    }
  }, [currentScreen, handleLoadDocs])

  // Open review with meta editing prefill
  useEffect(() => {
    if (currentArticle && currentScreen === 'review') {
      setMetaForm({
        title: currentArticle.title,
        meta_title: currentArticle.meta_title,
        meta_description: currentArticle.meta_description,
        slug_img: currentArticle.slug_img,
      })
      setEditHtmlContent(currentArticle.article_html)
    }
  }, [currentArticle?.id, currentScreen])

  // --- Sidebar Navigation ---
  const navItems: { screen: Screen; icon: React.ReactNode; label: string }[] = [
    { screen: 'dashboard', icon: <Home className="h-5 w-5" />, label: 'Dashboard' },
    { screen: 'new-article', icon: <Plus className="h-5 w-5" />, label: 'New Article' },
    { screen: 'knowledge-base', icon: <BookOpen className="h-5 w-5" />, label: 'Knowledge Base' },
  ]

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground flex">
        {/* ================================================================ */}
        {/* Sidebar */}
        {/* ================================================================ */}
        <aside className={cn('flex flex-col border-r border-border bg-card transition-all duration-300 shrink-0', sidebarOpen ? 'w-60' : 'w-16')}>
          {/* Brand */}
          <div className="flex items-center gap-3 p-4 border-b border-border min-h-[64px]">
            <button onClick={() => setSidebarOpen(prev => !prev)} className="flex items-center justify-center shrink-0">
              <CrosswordIcon size={28} />
            </button>
            {sidebarOpen && (
              <div className="overflow-hidden">
                <h1 className="font-serif text-lg font-bold text-foreground leading-tight">SolutionMots</h1>
                <p className="text-[10px] text-muted-foreground">Crossword Content Engine</p>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 py-4 space-y-1 px-2">
            {navItems.map(item => (
              <button key={item.screen} onClick={() => setCurrentScreen(item.screen)} className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', currentScreen === item.screen ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50')}>
                {item.icon}
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            ))}
            {/* Settings placeholder */}
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground opacity-50 cursor-not-allowed">
              <Settings className="h-5 w-5" />
              {sidebarOpen && <span>Settings</span>}
            </button>
          </nav>

          {/* Agent Status */}
          {sidebarOpen && (
            <div className="p-3 border-t border-border">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Agents</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <div className={cn('w-2 h-2 rounded-full shrink-0', activeAgentId === MANAGER_AGENT_ID ? 'bg-emerald-400 animate-pulse' : 'bg-muted-foreground/30')} />
                  <span className="text-muted-foreground truncate">Content Pipeline</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className={cn('w-2 h-2 rounded-full shrink-0', activeAgentId === IMAGE_AGENT_ID ? 'bg-emerald-400 animate-pulse' : 'bg-muted-foreground/30')} />
                  <span className="text-muted-foreground truncate">Image Generator</span>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* ================================================================ */}
        {/* Main Content */}
        {/* ================================================================ */}
        <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
          {/* Top Bar */}
          <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50 shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(prev => !prev)} className="lg:hidden p-1.5 rounded-md hover:bg-muted">
                <Menu className="h-5 w-5" />
              </button>
              <h2 className="font-serif text-xl font-bold">
                {currentScreen === 'dashboard' && 'Dashboard'}
                {currentScreen === 'new-article' && 'New Article'}
                {currentScreen === 'review' && 'Review & Publish'}
                {currentScreen === 'knowledge-base' && 'Knowledge Base'}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground cursor-pointer">Sample Data</Label>
                <Switch id="sample-toggle" checked={showSample} onCheckedChange={setShowSample} />
              </div>
              {currentScreen === 'dashboard' && (
                <Button size="sm" onClick={() => setCurrentScreen('new-article')}>
                  <Plus className="h-4 w-4 mr-1" />
                  New Article
                </Button>
              )}
            </div>
          </header>

          {/* Content Area */}
          <ScrollArea className="flex-1">
            <div className="p-6">
              {/* Status Message */}
              {statusMessage && (
                <InlineStatus message={statusMessage} onDismiss={() => setStatusMessage(null)} />
              )}

              {/* ========================================================== */}
              {/* DASHBOARD SCREEN */}
              {/* ========================================================== */}
              {currentScreen === 'dashboard' && (
                <div className="space-y-6">
                  {/* Filter Tabs */}
                  <Tabs value={dashboardFilter} onValueChange={(v) => setDashboardFilter(v as typeof dashboardFilter)}>
                    <TabsList className="bg-muted/50">
                      <TabsTrigger value="all">All ({displayArticles.length})</TabsTrigger>
                      <TabsTrigger value="draft">Draft ({displayArticles.filter(a => a.status === 'draft').length})</TabsTrigger>
                      <TabsTrigger value="published">Published ({displayArticles.filter(a => a.status === 'published').length})</TabsTrigger>
                      <TabsTrigger value="pending">Pending ({displayArticles.filter(a => a.status === 'pending').length})</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* Article List */}
                  {filteredArticles.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="flex flex-col items-center justify-center py-16">
                        <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
                        <p className="text-lg font-serif font-semibold text-muted-foreground mb-2">No articles yet</p>
                        <p className="text-sm text-muted-foreground mb-6">Create your first crossword article to get started.</p>
                        <Button onClick={() => setCurrentScreen('new-article')}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Article
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {filteredArticles.map(article => {
                        const statusBdg = getStatusBadge(article.status)
                        return (
                          <Card key={article.id} className="hover:border-primary/30 transition-colors cursor-pointer group" onClick={() => handleViewArticle(article.id)}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-serif font-semibold text-base truncate">{article.title || article.query}</h3>
                                  </div>
                                  <p className="text-sm text-muted-foreground truncate mb-2">Query: {article.query}</p>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="outline" className={cn('text-xs', statusBdg.className)}>
                                      {statusBdg.label}
                                    </Badge>
                                    <Badge variant="outline" className={cn('text-xs font-mono', getScoreColor(article.total_score))}>
                                      <Star className="h-3 w-3 mr-1" />
                                      {article.total_score}/100
                                    </Badge>
                                    {mounted && (
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatDate(article.created_at)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); handleViewArticle(article.id) }}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {!showSample && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={(e) => e.stopPropagation()}>
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete Article</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to delete this article? This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleDeleteArticle(article.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================== */}
              {/* NEW ARTICLE SCREEN */}
              {/* ========================================================== */}
              {currentScreen === 'new-article' && (
                <div className="max-w-2xl mx-auto space-y-6">
                  <Card>
                    <CardHeader className="text-center">
                      <div className="mx-auto mb-4">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                          <PenTool className="h-8 w-8 text-primary" />
                        </div>
                      </div>
                      <CardTitle className="font-serif text-2xl">Generate a New Article</CardTitle>
                      <CardDescription className="text-base leading-relaxed">
                        Enter a crossword clue query below. The content pipeline will write, evaluate, and improve the article automatically.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="query-input" className="text-sm font-medium">Crossword Clue Query</Label>
                        <Input id="query-input" placeholder="e.g., zebres bipedes" value={query} onChange={(e) => setQuery(e.target.value)} className="mt-1.5 text-base h-12 font-serif" disabled={generating} onKeyDown={(e) => { if (e.key === 'Enter' && !generating) handleGenerateArticle() }} />
                      </div>
                      <Button className="w-full h-12 text-base" onClick={handleGenerateArticle} disabled={generating || !query.trim()}>
                        {generating ? (
                          <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-5 w-5 mr-2" />
                            Generate Article
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {generating && (
                    <Card>
                      <CardContent className="pt-6">
                        <GenerationProgress stage={genStage} />
                        <p className="text-center text-xs text-muted-foreground mt-2">This may take up to 2 minutes...</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* ========================================================== */}
              {/* REVIEW & PUBLISH SCREEN */}
              {/* ========================================================== */}
              {currentScreen === 'review' && currentArticle && (
                <div className="space-y-4">
                  {/* Back button */}
                  <Button variant="ghost" size="sm" onClick={() => setCurrentScreen('dashboard')} className="text-muted-foreground">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to Dashboard
                  </Button>

                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Left Column - Article Preview (3/5) */}
                    <div className="lg:col-span-3 space-y-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="font-serif text-xl flex-1 min-w-0 truncate">{currentArticle.title || 'Untitled Article'}</CardTitle>
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              <Button variant="ghost" size="sm" onClick={() => { setEditingHtml(!editingHtml); setEditHtmlContent(currentArticle.article_html) }}>
                                <Edit className="h-4 w-4 mr-1" />
                                {editingHtml ? 'Preview' : 'Edit'}
                              </Button>
                              <Button variant="ghost" size="sm" onClick={handleCopyHtml}>
                                <Copy className="h-4 w-4 mr-1" />
                                Copy
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={cn('text-xs', getStatusBadge(currentArticle.status).className)}>
                              {getStatusBadge(currentArticle.status).label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">Query: {currentArticle.query}</span>
                          </div>
                        </CardHeader>
                        <Separator />
                        <CardContent className="pt-4">
                          {editingHtml ? (
                            <div className="space-y-3">
                              <Textarea value={editHtmlContent} onChange={(e) => setEditHtmlContent(e.target.value)} className="font-mono text-xs min-h-[400px] leading-relaxed" />
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setEditingHtml(false)}>Cancel</Button>
                                <Button size="sm" onClick={handleSaveHtml}>
                                  <Check className="h-4 w-4 mr-1" />
                                  Save Changes
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="max-w-none">
                              <div className="leading-relaxed text-sm [&_h1]:font-serif [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:mt-4 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:mt-4 [&_h3]:font-serif [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-3 [&_p]:mb-3 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-3 [&_ol]:space-y-1 [&_li]:text-sm [&_strong]:font-semibold [&_strong]:text-primary [&_a]:text-primary [&_a]:underline" dangerouslySetInnerHTML={{ __html: currentArticle.article_html || '<p class="text-muted-foreground">No content available.</p>' }} />
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Changes Made */}
                      {currentArticle.changes_made && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <RefreshCw className="h-4 w-4 text-primary" />
                              Changes Made
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {renderMarkdown(currentArticle.changes_made)}
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    {/* Right Column (2/5) */}
                    <div className="lg:col-span-2 space-y-4">
                      {/* Quality Score */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Quality Score</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center">
                          <ScoreCircle score={currentArticle.total_score} size={120} />
                          {currentArticle.evaluation_summary && (
                            <div className="mt-4 w-full">
                              <Separator className="mb-3" />
                              <p className="text-xs text-muted-foreground leading-relaxed">{currentArticle.evaluation_summary}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* SEO Metadata */}
                      <Card>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Globe className="h-4 w-4 text-primary" />
                              SEO Metadata
                            </CardTitle>
                            {!showSample && (
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setEditingMeta(!editingMeta); if (!editingMeta) { setMetaForm({ title: currentArticle.title, meta_title: currentArticle.meta_title, meta_description: currentArticle.meta_description, slug_img: currentArticle.slug_img }) } }}>
                                <Edit className="h-3 w-3 mr-1" />
                                {editingMeta ? 'Cancel' : 'Edit'}
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {editingMeta ? (
                            <>
                              <div>
                                <Label className="text-xs">Title</Label>
                                <Input value={metaForm.title} onChange={(e) => setMetaForm(prev => ({ ...prev, title: e.target.value }))} className="mt-1 text-sm" />
                              </div>
                              <div>
                                <Label className="text-xs">Meta Title</Label>
                                <Input value={metaForm.meta_title} onChange={(e) => setMetaForm(prev => ({ ...prev, meta_title: e.target.value }))} className="mt-1 text-sm" />
                              </div>
                              <div>
                                <Label className="text-xs">Meta Description</Label>
                                <Textarea value={metaForm.meta_description} onChange={(e) => setMetaForm(prev => ({ ...prev, meta_description: e.target.value }))} className="mt-1 text-sm" rows={3} />
                              </div>
                              <div>
                                <Label className="text-xs">Slug</Label>
                                <Input value={metaForm.slug_img} onChange={(e) => setMetaForm(prev => ({ ...prev, slug_img: e.target.value }))} className="mt-1 text-sm font-mono" />
                              </div>
                              <Button size="sm" className="w-full" onClick={handleSaveMeta}>
                                <Check className="h-4 w-4 mr-1" />
                                Save Metadata
                              </Button>
                            </>
                          ) : (
                            <>
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Title</p>
                                <p className="text-sm font-medium">{currentArticle.title || '--'}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Meta Title</p>
                                <p className="text-sm">{currentArticle.meta_title || '--'}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Meta Description</p>
                                <p className="text-sm text-muted-foreground leading-relaxed">{currentArticle.meta_description || '--'}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Slug</p>
                                <p className="text-sm font-mono text-primary">{currentArticle.slug_img || '--'}</p>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>

                      {/* Featured Image */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Image className="h-4 w-4 text-primary" />
                            Featured Image
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {currentArticle.image_url ? (
                            <div className="space-y-3">
                              <div className="rounded-lg overflow-hidden border border-border bg-muted">
                                <img src={currentArticle.image_url} alt={currentArticle.image_description ?? 'Featured image'} className="w-full h-auto object-cover" />
                              </div>
                              {currentArticle.image_description && (
                                <div>
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Description</p>
                                  <p className="text-xs text-muted-foreground leading-relaxed">{currentArticle.image_description}</p>
                                </div>
                              )}
                              {currentArticle.image_prompt_used && (
                                <div>
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Prompt Used</p>
                                  <p className="text-xs text-muted-foreground leading-relaxed font-mono">{currentArticle.image_prompt_used}</p>
                                </div>
                              )}
                              {!showSample && (
                                <Button variant="outline" size="sm" className="w-full" onClick={handleGenerateImage} disabled={generatingImage}>
                                  {generatingImage ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                                  Regenerate Image
                                </Button>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-6">
                              <Image className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                              <p className="text-sm text-muted-foreground mb-3">No image generated yet</p>
                              {!showSample && (
                                <Button size="sm" onClick={handleGenerateImage} disabled={generatingImage} className="w-full">
                                  {generatingImage ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Generating...
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="h-4 w-4 mr-2" />
                                      Generate Image
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Actions */}
                      {!showSample && (
                        <Card>
                          <CardContent className="pt-6 space-y-2">
                            <Button className="w-full" onClick={handlePublish} disabled={!currentArticle.image_url || currentArticle.status === 'published'}>
                              <Globe className="h-4 w-4 mr-2" />
                              {currentArticle.status === 'published' ? 'Already Published' : 'Publish to WordPress'}
                            </Button>
                            <Button variant="outline" className="w-full" onClick={handleRegenerateArticle}>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Regenerate Article
                            </Button>
                            <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setCurrentScreen('dashboard')}>
                              <ArrowLeft className="h-4 w-4 mr-2" />
                              Back to Dashboard
                            </Button>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Empty Review State */}
              {currentScreen === 'review' && !currentArticle && (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-lg font-serif font-semibold text-muted-foreground mb-2">No article selected</p>
                    <p className="text-sm text-muted-foreground mb-6">Select an article from the dashboard to review.</p>
                    <Button onClick={() => setCurrentScreen('dashboard')}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Go to Dashboard
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* ========================================================== */}
              {/* KNOWLEDGE BASE SCREEN */}
              {/* ========================================================== */}
              {currentScreen === 'knowledge-base' && (
                <div className="max-w-3xl mx-auto space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="font-serif text-xl flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-primary" />
                            Knowledge Base
                          </CardTitle>
                          <CardDescription className="mt-1">
                            Upload reference documents (PDF, DOCX, TXT) to improve article quality. The Article Writer agent uses these as reference material.
                          </CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleLoadDocs} disabled={kbLoading}>
                          <RefreshCw className={cn('h-4 w-4 mr-1', kbLoading && 'animate-spin')} />
                          Refresh
                        </Button>
                      </div>
                    </CardHeader>
                    <Separator />
                    <CardContent className="pt-6 space-y-6">
                      {/* Upload */}
                      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/30 transition-colors">
                        <Upload className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground mb-3">
                          Drop files here or click to upload
                        </p>
                        <p className="text-xs text-muted-foreground mb-4">
                          Supported: PDF, DOCX, TXT
                        </p>
                        <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleUploadDoc(file)
                          if (fileInputRef.current) fileInputRef.current.value = ''
                        }} />
                        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={kbUploading}>
                          {kbUploading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              Select File
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Document List */}
                      <div>
                        <h3 className="text-sm font-medium mb-3">Documents ({kbDocs.length})</h3>
                        {kbLoading && kbDocs.length === 0 ? (
                          <div className="space-y-2">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                          </div>
                        ) : kbDocs.length === 0 ? (
                          <div className="text-center py-8">
                            <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {kbDocs.map((doc, idx) => (
                              <div key={doc.id ?? doc.fileName ?? idx} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                  <FileText className="h-5 w-5 text-primary shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{doc.fileName}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {doc.fileType ? doc.fileType.toUpperCase() : 'Unknown'}
                                      {doc.status ? ` -- ${doc.status}` : ''}
                                    </p>
                                  </div>
                                </div>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive shrink-0">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Document</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Delete &quot;{doc.fileName}&quot; from the knowledge base? This will affect article generation quality.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteDoc(doc.fileName)} className="bg-destructive text-destructive-foreground">
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* RAG Info */}
                  <Card className="bg-muted/30">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium mb-1">About the Knowledge Base</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Documents uploaded here are used by the Article Writer agent as reference material. High-quality reference articles help produce better crossword solution content. The knowledge base name is &quot;SolutionMots Reference Articles&quot;.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </ScrollArea>
        </main>
      </div>
    </ErrorBoundary>
  )
}
