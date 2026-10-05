import React, { useState } from 'react'
import { GitBranch, Plus, Trash2, CheckCircle2, ShieldCheck } from 'lucide-react'
import { Modal } from '../UI/Modal'
import { Button } from '../UI/Button'
import { Badge } from '../UI/Badge'
import { useDbStore } from '../../store/dbStore'
import { useUIStore } from '../../store/uiStore'

export const BranchModal: React.FC = () => {
  const { branches, activeBranch, switchBranch, createBranch, deleteBranch } = useDbStore()
  const { branchModalOpen, setBranchModalOpen } = useUIStore()

  const [newBranchName, setNewBranchName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBranchName.trim()) return
    setIsCreating(true)
    await createBranch(newBranchName.trim())
    setNewBranchName('')
    setIsCreating(false)
  }

  return (
    <Modal
      isOpen={branchModalOpen}
      onClose={() => setBranchModalOpen(false)}
      title="Database Branching & Snapshots"
      subtitle="Isolate destructive schema migrations and DDL experimentation in browser IndexedDB"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Info card */}
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
          <ShieldCheck size={16} className="text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-slate-100">Zero-Risk Schema Testing</p>
            <p className="text-slate-400 mt-0.5 text-[11px]">
              Each branch runs on an isolated IndexedDB storage namespace. Create a branch before running destructive <code className="text-cyan-300">ALTER TABLE</code> or <code className="text-rose-300">DROP</code> migrations.
            </p>
          </div>
        </div>

        {/* Existing branches */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Available Branches
          </span>
          <div className="space-y-1.5">
            {branches.map((b) => {
              const isActive = b.id === activeBranch
              return (
                <div
                  key={b.id}
                  className={`p-2.5 rounded-lg border flex items-center justify-between transition-colors ${
                    isActive
                      ? 'bg-slate-800/80 border-cyan-500/60'
                      : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <GitBranch size={14} className={isActive ? 'text-cyan-400' : 'text-slate-500'} />
                    <span className="text-xs font-medium text-slate-200">{b.name}</span>
                    {isActive && (
                      <Badge variant="cyan" size="xs">
                        Active
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {!isActive && (
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => switchBranch(b.id)}
                      >
                        Switch
                      </Button>
                    )}
                    {b.id !== 'main' && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => deleteBranch(b.id)}
                        className="text-rose-400 hover:text-rose-300"
                        title="Delete branch"
                      >
                        <Trash2 size={13} />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Create new branch form */}
        <form onSubmit={handleCreate} className="pt-3 border-t border-slate-800 space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Create New Branch
          </span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              placeholder="e.g. migration-test, v2-schema"
              className="flex-1 px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 text-slate-200 rounded focus:outline-none focus:border-cyan-500 placeholder-slate-600"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={<Plus size={13} />}
              disabled={!newBranchName.trim() || isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Branch'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
