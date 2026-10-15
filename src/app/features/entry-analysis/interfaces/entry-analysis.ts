export interface IEntryAnalysis {
    id: number;
    journalId: number;
    summary: string;
    themes: string[];
    emotionalTone: string[];
    reflection: string;
    suggestedActions: string[];
    contentHash: string;
    aiModel?: string | null;
    // promptVersion?: string | null;
    createdAt: string;
}