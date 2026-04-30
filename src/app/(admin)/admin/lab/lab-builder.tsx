"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createRequestId } from "@/lib/security/request-id";
import { Reorder } from "framer-motion";
import { Trash, Edit, GripVertical, Check, Sparkles, X, Plus, GitBranch, ShieldAlert, Link as LinkIcon, Copy, Loader2, Wand2, FileText } from "lucide-react";
import type { LogicRule, DisqualificationRule } from "@/lib/runtime/logic";

type BuilderBlock = {
  id: string; // needed for framer-motion Reorder
  blockType: "consent" | "survey" | "multiple_choice" | "ux_task" | "reaction_time" | "iat" | "brs" | "thank_you";
  label: string;
  config: Record<string, any>;
};

const presets: Omit<BuilderBlock, "id">[] = [
  { blockType: "consent", label: "Consent Form", config: { title: "Research Consent", text: "By participating, you agree to allow us to collect and analyze your anonymized data for research purposes.", required: true } },
  { blockType: "multiple_choice", label: "Demographics", config: { questions: [], required: true } },
  { blockType: "survey", label: "Likert Question", config: { questions: [], required: true } },
  { blockType: "multiple_choice", label: "Multiple Choice", config: { questions: [] } },
  { blockType: "ux_task", label: "Click Test", config: { taskType: "first_click", prompt: "Tap where you would begin.", imageUrl: "" } },
  { blockType: "reaction_time", label: "Reaction Time", config: { instruction: "Tap only when you see a Color.", stimulusType: "text", stimuli: ["Red", "Blue", "Circle", "Square"], targetStimuli: ["Red", "Blue"], trialCount: 10, fixationMs: 500, minDelayMs: 1000, maxDelayMs: 2000 } },
  { blockType: "iat", label: "IAT Block", config: { leftLabel: "Design", rightLabel: "Non-Design", stimuli: ["Wireframe", "Analytics", "Prototype", "Survey"], required: true } },
  { blockType: "brs", label: "Brief Resilience Scale", config: {
    instruction: "Please respond to each item by marking one box per row.",
    scaleLabels: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"],
    items: [
      { id: "brs1", text: "I tend to bounce back quickly after hard times.", reversed: false },
      { id: "brs2", text: "I have a hard time making it through stressful events.", reversed: true },
      { id: "brs3", text: "It does not take me long to recover from a stressful event.", reversed: false },
      { id: "brs4", text: "It is hard for me to snap back when something bad happens.", reversed: true },
      { id: "brs5", text: "I usually come through difficult times with little trouble.", reversed: false },
      { id: "brs6", text: "I tend to take a long time to get over set-backs in my life.", reversed: true },
    ],
    required: true,
  }},
  { blockType: "thank_you", label: "Thank You", config: { title: "Study Complete", message: "Thank you for your participation! Your responses have been recorded.", showSummary: false } },
];

export function LabBuilder() {
  const [title, setTitle] = useState("Untitled Study");
  const [studyType, setStudyType] = useState<"ux_research" | "psychology_study">("ux_research");
  const [blocks, setBlocks] = useState<BuilderBlock[]>(() => {
    const b0 = { ...presets[0], id: crypto.randomUUID() };
    const b1 = { ...presets[1], id: crypto.randomUUID(), config: { ...presets[1].config, questions: [{ id: crypto.randomUUID(), question: "What is your primary age range?", options: ["Under 18", "18-24", "25-34", "35-44", "45+"] }] } };
    const b5 = { ...presets[5], id: crypto.randomUUID() };
    return [b0, b1, b5];
  });
  const [message, setMessage] = useState("");
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [logicRules, setLogicRules] = useState<LogicRule[]>([]);
  const [disqualificationRules, setDisqualificationRules] = useState<DisqualificationRule[]>([]);
  const [activeTab, setActiveTab] = useState<"content" | "logic">("content");
  const [savedPublicId, setSavedPublicId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiFileText, setAiFileText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const searchParams = useSearchParams();
  const studyId = searchParams.get("id");
  const router = useRouter();

   useEffect(() => {
     if (studyId) {
       loadStudy(studyId);
     }
   }, [studyId]);

   async function loadStudy(id: string) {
     setIsSaving(true);
     setMessage("Loading study...");
     try {
       const res = await fetch(`/api/admin/studies/${id}`);
       if (res.ok) {
         const data = await res.json();
         setTitle(data.title);
         setStudyType(data.project_id ? "ux_research" : "psychology_study");
         setSavedPublicId(data.public_id);
         
         if (data.study_blocks) {
            setBlocks(data.study_blocks.map((b: any) => {
              // Backward compatibility for single-question blocks
              if ((b.block_type === "survey" || b.block_type === "multiple_choice") && !b.config.questions) {
                b.config.questions = [{
                  id: crypto.randomUUID(),
                  question: b.config.question,
                  options: b.config.options,
                  scaleSize: b.config.scaleSize,
                  surveyType: b.config.surveyType
                }];
                // cleanup old fields
                delete b.config.question;
                delete b.config.options;
                delete b.config.scaleSize;
                delete b.config.surveyType;
              }
              return {
                id: b.id,
                blockType: b.block_type,
                label: b.label,
                config: b.config
              };
            }));
          }
         if (data.logic_rules) setLogicRules(data.logic_rules);
         if (data.disqualification_rules) setDisqualificationRules(data.disqualification_rules);
         setMessage("");
       } else {
         setMessage("Failed to load study.");
       }
     } catch {
       setMessage("Error loading study.");
     } finally {
       setIsSaving(false);
     }
   }

  const payload = useMemo(
    () => ({
      title,
      studyType,
      blocks: blocks.map((block, index) => ({ ...block, sortOrder: index + 1 })),
      logicRules: logicRules
        .filter(r => r.terminate || (r.target_block_id && r.target_block_id !== ""))
        .map(({ id, ...r }) => ({ 
          ...r, 
          target_block_id: r.target_block_id === "" ? null : r.target_block_id 
        })),
      disqualificationRules: disqualificationRules.map(({ id, ...r }) => r),
    }),
    [title, studyType, blocks, logicRules, disqualificationRules],
  );

  function addBlock(preset: Omit<BuilderBlock, "id">) {
    const newBlock = { ...preset, id: crypto.randomUUID() };
    
    // Add default question for survey/mcq if questions array is empty
    if ((newBlock.blockType === "survey" || newBlock.blockType === "multiple_choice") && (!newBlock.config.questions || newBlock.config.questions.length === 0)) {
      const isDemographics = newBlock.label === "Demographics";
      const isLikert = newBlock.blockType === "survey";
      
      newBlock.config = {
        ...newBlock.config,
        questions: [{
          id: crypto.randomUUID(),
          question: isDemographics ? "What is your primary age range?" : (isLikert ? "How usable was this flow?" : "New Question"),
          options: isDemographics ? ["Under 18", "18-24", "25-34", "35-44", "45+"] : (newBlock.blockType === "multiple_choice" ? ["Option 1", "Option 2"] : undefined),
          scaleSize: isLikert ? 5 : undefined
        }]
      };
    }
    
    setBlocks((prev) => [...prev, newBlock]);
  }

  function deleteBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (editingBlockId === id) setEditingBlockId(null);
  }

  function updateBlockConfig(id: string, newConfig: Record<string, any>) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, config: { ...b.config, ...newConfig } } : b)));
  }

  function updateBlockLabel(id: string, label: string) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, label } : b)));
  }

  function handleBulkImport() {
    const lines = bulkText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    const newBlocks: BuilderBlock[] = [];
    let currentBlock: BuilderBlock | null = null;

    lines.forEach(line => {
      // Check if it's an option for the current MC block
      const isOption = line.startsWith("-") || line.startsWith("*") || /^\d+[\.\)]/.test(line);
      
      if (currentBlock && currentBlock.blockType === "multiple_choice" && isOption) {
        const option = line.replace(/^[-*\d.\)]+\s*/, "");
        currentBlock.config.options = [...(currentBlock.config.options || []), option];
      } 
      else {
        const isLikert = /likert|satisfaction|rating|scale|how/i.test(line);
        
        // Finalize previous block if it was an empty MC
        if (currentBlock && currentBlock.blockType === "multiple_choice" && (!currentBlock.config.options || currentBlock.config.options.length === 0)) {
           currentBlock.blockType = "survey";
           currentBlock.label = "Likert Question";
           currentBlock.config = { question: currentBlock.config.question, scaleSize: 5 };
        }

        currentBlock = {
          id: crypto.randomUUID(),
          blockType: isLikert ? "survey" : "multiple_choice",
          label: isLikert ? "Likert Question" : "Multiple Choice",
          config: { 
            question: line,
            ...(isLikert ? { scaleSize: 5 } : { options: [] })
          }
        };
        newBlocks.push(currentBlock);
      }
    });

    setBlocks(prev => [...prev, ...newBlocks]);
    setIsBulkModalOpen(false);
    setBulkText("");
  }

  function addLogicRule(sourceBlockId: string) {
    const newRule: LogicRule = {
      id: crypto.randomUUID(),
      source_block_id: sourceBlockId,
      condition: { questionKey: `survey_${sourceBlockId}`, op: "eq", value: "" },
      target_block_id: null,
      terminate: false,
    };
    setLogicRules((prev) => [...prev, newRule]);
  }

  function updateLogicRule(id: string, updates: Partial<LogicRule>) {
    setLogicRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }

  function deleteLogicRule(id: string) {
    setLogicRules((prev) => prev.filter((r) => r.id !== id));
  }

  function addDisqualificationRule(sourceBlockId: string) {
    const newRule: DisqualificationRule = {
      id: crypto.randomUUID(),
      condition: { questionKey: `survey_${sourceBlockId}`, op: "eq", value: "" },
      disqualify_message: "Sorry, you do not meet the requirements for this study.",
    };
    setDisqualificationRules((prev) => [...prev, newRule]);
  }

  function deleteDisqualificationRule(id: string) {
    setDisqualificationRules((prev) => prev.filter((r) => r.id !== id));
  }

  async function generateWithAi() {
    if (!aiPrompt && !aiFileText) return;
    setIsGenerating(true);
    setMessage("AI is designing your study...");
    try {
      const res = await fetch("/api/admin/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt, fileContent: aiFileText }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.title) setTitle(data.title);
        if (data.studyType) setStudyType(data.studyType);
        if (data.blocks) {
          // Ensure every block and question has a valid UUID
          const sanitizedBlocks = data.blocks.map((b: any) => ({
            ...b,
            id: b.id || crypto.randomUUID(),
            config: {
              ...b.config,
              questions: (b.config.questions || []).map((q: any) => ({
                ...q,
                id: q.id || crypto.randomUUID()
              }))
            }
          }));
          setBlocks(sanitizedBlocks);
        }
        setIsAiModalOpen(false);
        setMessage("Study generated by AI!");
      } else {
        const err = await res.json();
        setMessage(`AI Error: ${err.error || "Generation failed"}`);
      }
    } catch (err) {
      setMessage("Failed to connect to AI service.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function saveDraft(status: "draft" | "published") {
    if (isSaving) return;
    setIsSaving(true);
    setMessage(status === "published" ? "Publishing study..." : "Saving draft...");
    try {
      // 1. Auto-provision org+membership if missing
      const setupRes = await fetch("/api/admin/setup", { method: "POST" });
      if (!setupRes.ok) {
        const setupData = await setupRes.json().catch(() => ({}));
        setMessage(`Setup failed: ${setupData.error || "Could not create organization."}`);
        return;
      }

      // 2. Save the study
      const rid = createRequestId();
      const url = studyId ? `/api/admin/studies/${studyId}` : "/api/admin/studies";
      const method = studyId ? "PATCH" : "POST";

      const finalPayload = { ...payload, status };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "x-request-id": rid },
        body: JSON.stringify(finalPayload),
      });
      if (response.ok) {
        if (!studyId) {
          const data = await response.json();
          setSavedPublicId(data.publicId);
          setMessage("Study published successfully!");
          // Redirect to edit page to prevent duplicate POSTs on re-save
          router.push(`/admin/lab?id=${data.id}`);
        } else {
          setMessage("Study updated successfully!");
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        setMessage(`Failed to save: ${errData.error || response.statusText}`);
      }
    } catch {
      setMessage("Network error. Please check your connection.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="grid gap-4">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {studyId ? "Edit Study" : "Lab Builder"}
          </h1>
          <p className="text-white/40">
            {studyId ? `Editing: ${title}` : "Design your study, add logic, and collect insights."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {savedPublicId && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Live at: /participant/{savedPublicId}</span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/participant/${savedPublicId}`);
                  setMessage("Link copied to clipboard!");
                }}
                className="ml-2 p-1 hover:bg-emerald-500/20 rounded transition-colors"
                title="Copy Link"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          )}
          <button 
            onClick={() => setIsAiModalOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-[var(--brand)]/30 bg-[var(--brand)]/5 px-6 py-2.5 text-sm font-semibold text-[var(--brand)] hover:bg-[var(--brand)]/10 transition-all active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4" />
            AI Generator
          </button>
          <div className="h-8 w-[1px] bg-white/10 mx-2" />
          <button 
            onClick={() => saveDraft("draft")}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait"
          >
            {isSaving ? "Saving..." : "Save Draft"}
          </button>
          <button 
            onClick={() => saveDraft("published")}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl bg-[var(--brand)] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--brand-strong)]/20 hover:bg-[var(--brand-strong)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait"
          >
            <Check className="w-4 h-4" />
            {isSaving ? "Publishing..." : "Publish Study"}
          </button>
        </div>
      </div>

      {/* Status message bar */}
      {message && (
        <div className={`mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
          message.includes("failed") || message.includes("Failed") || message.includes("error")
            ? "bg-rose-500/10 border border-rose-500/20 text-rose-300"
            : message.includes("successfully") || message.includes("copied")
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
              : "bg-blue-500/10 border border-blue-500/20 text-blue-300"
        }`}>
          {message}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-[200px_1fr_280px]">
        <div className="rounded-xl border border-dashed border-white/25 p-3">
          <p className="mb-3 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Toolbox</p>
          <div className="grid gap-2">
            {presets.map((block) => (
              <button
                key={block.label}
                type="button"
                className="rounded-lg border border-white/15 px-3 py-2 text-left text-sm hover:bg-white/5 transition-colors group flex items-center justify-between"
                onClick={() => addBlock(block)}
              >
                <span>+ Add {block.label}</span>
                <Plus className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />
              </button>
            ))}
            <div className="mt-4 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Bulk Import
              </button>
            </div>
          </div>
        </div>
        
        <div className="rounded-xl border border-white/15 bg-white/5 p-3">
          <div className="grid gap-2 sm:grid-cols-2 mb-4">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm"
              placeholder="Study Title"
            />
            <select
              value={studyType}
              onChange={(event) => setStudyType(event.target.value as "ux_research" | "psychology_study")}
              className="rounded-lg border border-white/20 bg-[#091126] px-3 py-2 text-sm"
            >
              <option value="ux_research">UX Research</option>
              <option value="psychology_study">Psychology Study</option>
            </select>
          </div>
          
          <Reorder.Group axis="y" values={blocks} onReorder={setBlocks} className="grid gap-2">
            {blocks.map((block, index) => (
              <Reorder.Item key={block.id} value={block} className="rounded-lg border border-white/15 bg-[#0a1128] overflow-hidden">
                <div className="flex items-center gap-2 p-3 border-b border-white/5">
                  <GripVertical className="w-4 h-4 text-white/40 cursor-grab active:cursor-grabbing shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">
                      {index + 1}. {block.blockType}
                    </p>
                    <p className="text-sm font-medium truncate">{block.label}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      onClick={() => {
                        setEditingBlockId(editingBlockId === block.id ? null : block.id);
                        setActiveTab("content");
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-white/10 text-white/70 transition-colors text-xs font-medium"
                    >
                      {editingBlockId === block.id ? (
                        <><Check className="w-3.5 h-3.5" /> Done</>
                      ) : (
                        <><Edit className="w-3.5 h-3.5" /> Configure</>
                      )}
                    </button>
                    <button 
                      onClick={() => deleteBlock(block.id)}
                      className="p-1.5 rounded-md hover:bg-red-500/20 text-red-400 transition-colors"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {editingBlockId === block.id && (
                  <div className="p-4 bg-black/20 text-sm">
                    <div className="flex items-center gap-4 border-b border-white/5 mb-4 pb-2">
                      <button 
                        onClick={() => setActiveTab("content")}
                        className={`pb-1 text-xs font-medium border-b-2 transition-all ${activeTab === "content" ? "border-[var(--brand)] text-white" : "border-transparent text-white/40 hover:text-white/60"}`}
                      >
                        Content
                      </button>
                      <button 
                        onClick={() => setActiveTab("logic")}
                        className={`pb-1 text-xs font-medium border-b-2 transition-all ${activeTab === "logic" ? "border-[var(--brand)] text-white" : "border-transparent text-white/40 hover:text-white/60"}`}
                      >
                        Logic & Branching
                      </button>
                    </div>

                    {activeTab === "content" ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <label className="block text-xs text-white/60 mb-1">Block Label</label>
                            <input 
                              value={block.label}
                              onChange={(e) => updateBlockLabel(block.id, e.target.value)}
                              className="w-full rounded-md border border-white/10 bg-transparent px-2 py-1.5"
                            />
                          </div>
                          <div className="pt-5">
                            <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer select-none">
                              <input 
                                type="checkbox"
                                checked={block.config.required !== false}
                                onChange={(e) => updateBlockConfig(block.id, { required: e.target.checked })}
                                className="rounded border-white/20 bg-transparent"
                              />
                              Mandatory
                            </label>
                          </div>
                        </div>
                    
                    {block.blockType === "consent" && (
                      <div className="grid gap-3">
                        <div>
                          <label className="block text-xs text-white/60 mb-1">Consent Title</label>
                          <input 
                            value={block.config.title || ""}
                            onChange={(e) => updateBlockConfig(block.id, { title: e.target.value })}
                            className="w-full rounded-md border border-white/10 bg-transparent px-2 py-1.5"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-white/60 mb-1">Consent Agreement Text</label>
                          <textarea 
                            value={block.config.text || ""}
                            onChange={(e) => updateBlockConfig(block.id, { text: e.target.value })}
                            className="w-full rounded-md border border-white/10 bg-transparent px-2 py-1.5 h-24"
                          />
                        </div>
                      </div>
                    )}

                    {(block.blockType === "survey" || block.blockType === "multiple_choice") && (
                      <div className="grid gap-3">
                        <div className="space-y-3">
                          {(block.config.questions || []).map((q: any, qIndex: number) => (
                            <div key={q.id} className="p-3 rounded-lg border border-white/10 bg-white/5 space-y-3 relative">
                              <button 
                                onClick={() => {
                                  const questions = [...block.config.questions];
                                  questions.splice(qIndex, 1);
                                  updateBlockConfig(block.id, { questions });
                                }}
                                className="absolute top-2 right-2 p-1 text-white/40 hover:text-rose-400"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                              
                              <div>
                                <label className="block text-xs text-white/60 mb-1">Question {qIndex + 1}</label>
                                <input 
                                  value={q.question || ""}
                                  onChange={(e) => {
                                    const questions = [...block.config.questions];
                                    questions[qIndex] = { ...q, question: e.target.value };
                                    updateBlockConfig(block.id, { questions });
                                  }}
                                  className="w-full rounded-md border border-white/10 bg-transparent px-2 py-1.5 pr-8"
                                  placeholder="e.g. How easy was it to navigate?"
                                />
                              </div>

                              {block.blockType === "survey" && (
                                <div>
                                  <label className="block text-xs text-white/60 mb-1">Scale Size (e.g., 5 or 7)</label>
                                  <input 
                                    type="number"
                                    min="3" max="10"
                                    value={q.scaleSize || 5}
                                    onChange={(e) => {
                                      const questions = [...block.config.questions];
                                      questions[qIndex] = { ...q, scaleSize: parseInt(e.target.value) || 5 };
                                      updateBlockConfig(block.id, { questions });
                                    }}
                                    className="w-full rounded-md border border-white/10 bg-transparent px-2 py-1.5"
                                  />
                                </div>
                              )}

                              {block.blockType === "multiple_choice" && (
                                <div>
                                  <label className="block text-xs text-white/60 mb-1">Options (comma separated)</label>
                                  <input 
                                    value={(q.options || []).join(", ")}
                                    onChange={(e) => {
                                      const questions = [...block.config.questions];
                                      questions[qIndex] = { ...q, options: e.target.value.split(",").map((s: string) => s.trim()) };
                                      updateBlockConfig(block.id, { questions });
                                    }}
                                    className="w-full rounded-md border border-white/10 bg-transparent px-2 py-1.5"
                                    placeholder="Option A, Option B, Option C"
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => {
                            const questions = [...(block.config.questions || [])];
                            questions.push({ 
                              id: crypto.randomUUID(), 
                              question: "New Question", 
                              ...(block.blockType === "multiple_choice" ? { options: ["Option 1", "Option 2"] } : { scaleSize: 5 }) 
                            });
                            updateBlockConfig(block.id, { questions });
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-white/20 text-xs text-white/60 hover:text-white/90 hover:border-white/40 transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Question
                        </button>
                      </div>
                    )}

                    {block.blockType === "ux_task" && (
                      <>
                        <div>
                          <label className="block text-xs text-white/60 mb-1">Task Prompt</label>
                          <input 
                            value={block.config.prompt || ""}
                            onChange={(e) => updateBlockConfig(block.id, { prompt: e.target.value })}
                            className="w-full rounded-md border border-white/10 bg-transparent px-2 py-1.5"
                            placeholder="e.g. Click where you would checkout."
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-white/60 mb-1">Image URL (for Click Test)</label>
                          <input 
                            value={block.config.imageUrl || ""}
                            onChange={(e) => updateBlockConfig(block.id, { imageUrl: e.target.value })}
                            className="w-full rounded-md border border-white/10 bg-transparent px-2 py-1.5"
                            placeholder="https://example.com/screenshot.png"
                          />
                        </div>
                      </>
                    )}

                    {block.blockType === "reaction_time" && (
                      <div className="grid gap-3">
                        <div>
                          <label className="block text-xs text-white/60 mb-1">Instructions</label>
                          <input 
                            value={block.config.instruction || ""}
                            onChange={(e) => updateBlockConfig(block.id, { instruction: e.target.value })}
                            className="w-full rounded-md border border-white/10 bg-transparent px-2 py-1.5"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-white/60 mb-1">Trial Count</label>
                            <input 
                              type="number"
                              value={block.config.trialCount || 10}
                              onChange={(e) => updateBlockConfig(block.id, { trialCount: parseInt(e.target.value) || 1 })}
                              className="w-full rounded-md border border-white/10 bg-transparent px-2 py-1.5"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-white/60 mb-1">Fixation (ms)</label>
                            <input 
                              type="number"
                              value={block.config.fixationMs || 500}
                              onChange={(e) => updateBlockConfig(block.id, { fixationMs: parseInt(e.target.value) || 0 })}
                              className="w-full rounded-md border border-white/10 bg-transparent px-2 py-1.5"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-white/60 mb-1">Min Delay (ms)</label>
                            <input 
                              type="number"
                              value={block.config.minDelayMs || 1000}
                              onChange={(e) => updateBlockConfig(block.id, { minDelayMs: parseInt(e.target.value) || 0 })}
                              className="w-full rounded-md border border-white/10 bg-transparent px-2 py-1.5"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-white/60 mb-1">Max Delay (ms)</label>
                            <input 
                              type="number"
                              value={block.config.maxDelayMs || 2000}
                              onChange={(e) => updateBlockConfig(block.id, { maxDelayMs: parseInt(e.target.value) || 0 })}
                              className="w-full rounded-md border border-white/10 bg-transparent px-2 py-1.5"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-white/60 mb-1">Stimulus Type</label>
                          <select 
                            value={block.config.stimulusType || "text"}
                            onChange={(e) => updateBlockConfig(block.id, { stimulusType: e.target.value })}
                            className="w-full rounded-md border border-white/10 bg-[#091126] px-2 py-1.5"
                          >
                            <option value="text">Text</option>
                            <option value="image">Image (URLs)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-white/60 mb-1">Stimuli List (comma separated)</label>
                          <textarea 
                            value={(block.config.stimuli || []).join(", ")}
                            onChange={(e) => updateBlockConfig(block.id, { stimuli: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                            className="w-full rounded-md border border-white/10 bg-transparent px-2 py-1.5 h-20"
                            placeholder={block.config.stimulusType === "image" ? "https://url1.png, https://url2.png" : "Red, Green, Blue"}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-white/60 mb-1">Target Stimuli (require response)</label>
                          <input 
                            value={(block.config.targetStimuli || []).join(", ")}
                            onChange={(e) => updateBlockConfig(block.id, { targetStimuli: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                            className="w-full rounded-md border border-white/10 bg-transparent px-2 py-1.5"
                            placeholder="Items from the list above that are 'Targets'"
                          />
                        </div>
                      </div>
                    )}

                    {block.blockType === "iat" && (
                      <div className="grid gap-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-white/60 mb-1">Left Label</label>
                            <input 
                              value={block.config.leftLabel || ""}
                              onChange={(e) => updateBlockConfig(block.id, { leftLabel: e.target.value })}
                              className="w-full rounded-md border border-white/10 bg-transparent px-2 py-1.5"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-white/60 mb-1">Right Label</label>
                            <input 
                              value={block.config.rightLabel || ""}
                              onChange={(e) => updateBlockConfig(block.id, { rightLabel: e.target.value })}
                              className="w-full rounded-md border border-white/10 bg-transparent px-2 py-1.5"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-white/60 mb-1">Stimuli Words (comma separated)</label>
                          <input 
                            value={(block.config.stimuli || []).join(", ")}
                            onChange={(e) => updateBlockConfig(block.id, { stimuli: e.target.value.split(",").map(s => s.trim()) })}
                            className="w-full rounded-md border border-white/10 bg-transparent px-2 py-1.5"
                            placeholder="Wireframe, Analytics, Prototype"
                          />
                        </div>
                      </div>
                    )}

                    {block.blockType === "brs" && (
                      <div className="grid gap-3">
                        <div className="p-3 rounded-lg border border-violet-500/20 bg-violet-500/5">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-violet-400" />
                            <p className="text-[10px] uppercase tracking-widest text-violet-300 font-bold">Brief Resilience Scale (Smith et al., 2008)</p>
                          </div>
                          <p className="text-xs text-white/50 leading-relaxed">
                            A validated 6-item measure of resilience. Items 2, 4, and 6 are automatically reverse-scored.
                            The final BRS score is the mean of all items (range 1.00–5.00).
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs text-white/60 mb-1">Instructions</label>
                          <input 
                            value={block.config.instruction || ""}
                            onChange={(e) => updateBlockConfig(block.id, { instruction: e.target.value })}
                            className="w-full rounded-md border border-white/10 bg-transparent px-2 py-1.5"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-white/60 mb-2">Items</label>
                          <div className="space-y-2">
                            {(block.config.items || []).map((item: { id: string; text: string; reversed: boolean }, i: number) => (
                              <div key={item.id} className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs ${
                                item.reversed 
                                  ? "border-amber-500/15 bg-amber-500/5" 
                                  : "border-white/10 bg-black/20"
                              }`}>
                                <span className="shrink-0 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/50 mt-0.5">{i + 1}</span>
                                <input 
                                  value={item.text}
                                  onChange={(e) => {
                                    const updated = [...(block.config.items || [])];
                                    updated[i] = { ...updated[i], text: e.target.value };
                                    updateBlockConfig(block.id, { items: updated });
                                  }}
                                  className="flex-1 bg-transparent border-none outline-none text-sm"
                                />
                                {item.reversed && (
                                  <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/20">
                                    Rev
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-white/60 mb-1">Scale Labels (comma separated)</label>
                          <input 
                            value={(block.config.scaleLabels || []).join(", ")}
                            onChange={(e) => updateBlockConfig(block.id, { scaleLabels: e.target.value.split(",").map((s: string) => s.trim()) })}
                            className="w-full rounded-md border border-white/10 bg-transparent px-2 py-1.5"
                            placeholder="Strongly Disagree, Disagree, Neutral, Agree, Strongly Agree"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                      <div className="space-y-4">
                        <div className="space-y-3">
                          <h3 className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Branching Rules</h3>
                          {logicRules.filter(r => r.source_block_id === block.id).map(rule => (
                            <div key={rule.id} className="p-3 rounded-lg border border-white/10 bg-black/40 space-y-2">
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-white/40">IF answer is</span>
                                <select 
                                  value={String((rule.condition as any).op || "eq")}
                                  onChange={(e) => updateLogicRule(rule.id, { condition: { ...rule.condition, op: e.target.value } })}
                                  className="bg-[#091126] border border-white/10 rounded px-1 py-0.5"
                                >
                                  <option value="eq">is equal to</option>
                                  <option value="neq">is NOT equal to</option>
                                  <option value="contains">contains</option>
                                </select>
                                <input 
                                  value={String((rule.condition as any).value || "")}
                                  onChange={(e) => updateLogicRule(rule.id, { condition: { ...rule.condition, value: e.target.value } })}
                                  placeholder="Value"
                                  className="bg-transparent border border-white/10 rounded px-2 py-0.5 flex-1"
                                />
                              </div>
                              <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-white/40">THEN</span>
                                  <select 
                                    value={rule.terminate ? "terminate" : rule.target_block_id || ""}
                                    onChange={(e) => {
                                      if (e.target.value === "terminate") {
                                        updateLogicRule(rule.id, { terminate: true, target_block_id: null });
                                      } else {
                                        updateLogicRule(rule.id, { terminate: false, target_block_id: e.target.value });
                                      }
                                    }}
                                    className="bg-[#091126] border border-white/10 rounded px-1 py-0.5"
                                  >
                                    <option value="">Continue to next</option>
                                    <option value="terminate">End Study (Complete)</option>
                                    {blocks.filter(b => b.id !== block.id).map(b => (
                                      <option key={b.id} value={b.id}>Jump to: {b.label}</option>
                                    ))}
                                  </select>
                                </div>
                                <button onClick={() => deleteLogicRule(rule.id)} className="text-rose-400 hover:text-rose-300">
                                  <Trash className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                          <button 
                            onClick={() => addLogicRule(block.id)}
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-white/20 text-xs text-white/40 hover:text-white/60 hover:border-white/40 transition-all"
                          >
                            <GitBranch className="w-3 h-3" />
                            Add Branching Rule
                          </button>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-white/5">
                          <h3 className="text-[10px] uppercase tracking-widest text-rose-400/60 font-bold">Screening / Disqualification</h3>
                          {disqualificationRules.filter(r => (r.condition as any).questionKey === `survey_${block.id}`).map(rule => (
                            <div key={rule.id} className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/5 space-y-2">
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-rose-400/60">IF answer is</span>
                                <input 
                                  value={String((rule.condition as any).value || "")}
                                  onChange={(e) => setDisqualificationRules(prev => prev.map(r => r.id === rule.id ? { ...r, condition: { ...r.condition, value: e.target.value } } : r))}
                                  placeholder="Value"
                                  className="bg-transparent border border-rose-500/20 rounded px-2 py-0.5 flex-1 text-rose-200"
                                />
                                <span className="text-rose-400/60">THEN Disqualify</span>
                              </div>
                              <div className="pt-1 border-t border-rose-500/10 flex items-start gap-2">
                                <textarea 
                                  value={rule.disqualify_message}
                                  onChange={(e) => setDisqualificationRules(prev => prev.map(r => r.id === rule.id ? { ...r, disqualify_message: e.target.value } : r))}
                                  className="bg-transparent border border-rose-500/10 rounded px-2 py-1 flex-1 text-[10px] text-rose-300/70"
                                  placeholder="Screening message..."
                                />
                                <button onClick={() => deleteDisqualificationRule(rule.id)} className="text-rose-400 hover:text-rose-300 mt-1">
                                  <Trash className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                          <button 
                            onClick={() => addDisqualificationRule(block.id)}
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-rose-500/20 text-xs text-rose-400/40 hover:text-rose-400/60 hover:border-rose-500/40 transition-all"
                          >
                            <ShieldAlert className="w-3 h-3" />
                            Add Screening Rule
                          </button>
                        </div>
                      </div>
                    )}
                    {block.blockType === "thank_you" && (
                      <div className="grid gap-3">
                         <div>
                          <label className="block text-xs text-white/60 mb-1">Ending Title</label>
                          <input 
                            value={block.config.title || ""}
                            onChange={(e) => updateBlockConfig(block.id, { title: e.target.value })}
                            className="w-full rounded-md border border-white/10 bg-transparent px-2 py-1.5"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-white/60 mb-1">Closing Message</label>
                          <textarea 
                            value={block.config.message || ""}
                            onChange={(e) => updateBlockConfig(block.id, { message: e.target.value })}
                            className="w-full rounded-md border border-white/10 bg-transparent px-2 py-1.5 h-24"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Reorder.Item>
            ))}
          </Reorder.Group>
          {blocks.length === 0 && (
            <p className="text-sm text-center text-white/40 py-8 border border-dashed border-white/10 rounded-lg mt-2">
              Drag blocks here from the toolbox.
            </p>
          )}
        </div>
        
        <div className="rounded-xl border border-dashed border-white/25 p-3 h-fit sticky top-4">
          <p className="mb-3 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Logic Panel</p>
          <ul className="grid gap-2 text-xs text-[var(--muted)]">
            <li>If role = Designer {"->"} Advanced UI branch</li>
            <li>Randomize block order within task group</li>
            <li>Terminate if age under 18</li>
          </ul>
          <button type="button" onClick={() => saveDraft("draft")} className="mt-4 w-full rounded-lg bg-[var(--brand-strong)] px-3 py-2 text-sm text-white hover:opacity-90 transition-opacity">
            Save Draft
          </button>
          {message ? <p className="mt-2 text-xs text-[var(--muted)]">{message}</p> : null}
        </div>
      </div>

      {/* Bulk Import Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/15 bg-[#0a1128] p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  Bulk Import
                </h2>
                <p className="text-xs text-white/50 mt-1">Paste your questions below. We'll automatically detect types and options.</p>
              </div>
              <button 
                onClick={() => setIsBulkModalOpen(false)}
                className="p-2 rounded-full hover:bg-white/5 text-white/40 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`Example:\nHow satisfied are you with the navigation?\nWhat is your primary role?\n- Designer\n- Developer\n- Manager`}
              className="w-full h-80 rounded-xl border border-white/10 bg-black/20 p-4 text-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all font-mono"
            />
            
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkImport}
                disabled={!bulkText.trim()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20"
              >
                Generate Questionnaire
              </button>
            </div>
          </div>
        </div>
      )}
      {/* AI Generator Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <article className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0a1128] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--brand)]/20 text-[var(--brand)]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">AI Study Designer</h3>
                  <p className="text-xs text-white/40">Convert questionnaires or ideas into studies using AI.</p>
                </div>
              </div>
              <button onClick={() => setIsAiModalOpen(false)} className="p-2 text-white/20 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-2">Paste Questionnaire / Content</label>
                <textarea 
                  value={aiFileText}
                  onChange={(e) => setAiFileText(e.target.value)}
                  placeholder="Paste your PDF text, Word document content, or raw questionnaire here..."
                  className="w-full h-40 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white placeholder:text-white/20 focus:border-[var(--brand)]/50 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-2">Special Instructions (Optional)</label>
                <input 
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. Make it professional, include demographics, use 7-point Likert scales..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-[var(--brand)]/50 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => setIsAiModalOpen(false)}
                className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-semibold text-white/60 hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={generateWithAi}
                disabled={isGenerating || (!aiPrompt && !aiFileText)}
                className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-[var(--brand)] py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--brand)]/20 hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Designing Study...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Study
                  </>
                )}
              </button>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
