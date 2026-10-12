
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

import { IJournalDocument } from '../../../../core/shared/interfaces/journal-document.interface';

const EMPTY_DOCUMENT: IJournalDocument = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

@Component({
  selector: 'app-journal-editor',
  standalone: true,
  templateUrl: './journal-editor.html',
  styleUrl: './journal-editor.scss',
})
export class JournalEditorComponent
  implements OnInit, OnChanges, OnDestroy {

  @ViewChild('editorElement', { static: true })
  editorElement!: ElementRef<HTMLDivElement>;

  @Input() initialContent: IJournalDocument = EMPTY_DOCUMENT;
  @Input() editable = true;

  @Output() contentChange =
    new EventEmitter<IJournalDocument>();

  editor?: Editor;
  private suppressContentChange = false;

  ngOnInit(): void {
    this.suppressContentChange = true;
    try {
      this.editor = new Editor({
        element: this.editorElement.nativeElement,

        extensions: [
          StarterKit.configure({
            heading: {
              levels: [1, 2, 3],
            },
          }),
        ],

        content: this.initialContent,
        editable: this.editable,

        editorProps: {
          attributes: {
            class: 'journal-prose',
            'aria-label': 'Journal content',
            'data-placeholder': "What's on your mind?",
            spellcheck: 'true',
          },
        },

        onUpdate: ({ editor }) => {
          if (!this.suppressContentChange) {
            this.contentChange.emit(
              editor.getJSON() as IJournalDocument,
            );
          }
        },
      });
    } finally {
      this.suppressContentChange = false;
    }

  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.editor) {
      return;
    }

    if (changes['initialContent'] && this.initialContent) {
      const currentContent = JSON.stringify(
        this.editor.getJSON(),
      );

      const incomingContent = JSON.stringify(
        this.initialContent,
      );

      // Don't reset the selection or cursor if content is unchanged.
      if (currentContent !== incomingContent) {
        this.suppressContentChange = true;
        try {
          this.editor.commands.setContent(
            this.initialContent,
            { emitUpdate: false },
          );
        } finally {
          this.suppressContentChange = false;
        }
      }
    }

    if (changes['editable']) {
      if (this.editor) {
        this.suppressContentChange = true;
        try {
          this.editor.setEditable(this.editable);
        } finally {
          this.suppressContentChange = false;
        }
      }
    }
  }

  toggleBold(): void {
    this.editor?.chain().focus().toggleBold().run();
  }

  toggleItalic(): void {
    this.editor?.chain().focus().toggleItalic().run();
  }

  toggleStrike(): void {
    this.editor?.chain().focus().toggleStrike().run();
  }

  setParagraph(): void {
    this.editor?.chain().focus().setParagraph().run();
  }

  setHeading(level: 1 | 2 | 3): void {
    this.editor?.chain().focus().toggleHeading({ level }).run();
  }

  toggleBulletList(): void {
    this.editor?.chain().focus().toggleBulletList().run();
  }

  toggleOrderedList(): void {
    this.editor?.chain().focus().toggleOrderedList().run();
  }

  toggleBlockquote(): void {
    this.editor?.chain().focus().toggleBlockquote().run();
  }

  indentList(): void {
    this.editor?.chain().focus().sinkListItem('listItem').run();
  }

  outdentList(): void {
    this.editor?.chain().focus().liftListItem('listItem').run();
  }

  isActive(
    name: string,
    attributes?: Record<string, unknown>,
  ): boolean {
    return this.editor?.isActive(name, attributes) ?? false;
  }

  canUndo(): boolean {
    return this.editor?.can().undo() ?? false;
  }

  canRedo(): boolean {
    return this.editor?.can().redo() ?? false;
  }

  undo(): void {
    this.editor?.chain().focus().undo().run();
  }

  redo(): void {
    this.editor?.chain().focus().redo().run();
  }

  clearFormatting(): void {
    if (!this.editor) {
      return;
    }

    this.editor
      .chain()
      .focus()
      .clearNodes()
      .unsetAllMarks()
      .setParagraph()
      .run();
  }

  getCharacterCount(): number {
    return this.editor?.getText().length ?? 0;
  }

  ngOnDestroy(): void {
    this.editor?.destroy();
    this.editor = undefined;
  }
}
