import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Kbd, KbdGroup } from '@/components/ui/kbd';

const shortcutGroups: { title: string; shortcuts: [string[], string][] }[] = [
    {
        title: 'Everywhere',
        shortcuts: [
            [['Ctrl', 'K'], 'Open command palette'],
            [['C'], 'Create issue'],
            [['G', 'I'], 'Go to issues'],
            [['G', 'M'], 'Go to my issues'],
            [['G', 'B'], 'Go to board'],
            [['G', 'P'], 'Go to projects'],
            [['G', 'D'], 'Go to dashboard'],
            [['G', 'N'], 'Go to inbox'],
            [['?'], 'Show keyboard shortcuts'],
        ],
    },
    {
        title: 'Issue list',
        shortcuts: [
            [['J'], 'Select next issue'],
            [['K'], 'Select previous issue'],
            [['Enter'], 'Open selected issue'],
            [['V'], 'Switch between list and board'],
        ],
    },
    {
        title: 'Issue',
        shortcuts: [
            [['S'], 'Change status'],
            [['P'], 'Change priority'],
            [['A'], 'Assign'],
            [['I'], 'Assign to me'],
            [['L'], 'Change labels'],
            [['D'], 'Set due date'],
        ],
    },
];

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export function KeyboardShortcutsDialog({ open, onOpenChange }: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Keyboard shortcuts</DialogTitle>
                    <DialogDescription>
                        Press keys one after another for sequences like G then
                        I.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6">
                    {shortcutGroups.map((group) => (
                        <section key={group.title} className="grid gap-2">
                            <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                {group.title}
                            </h3>
                            {group.shortcuts.map(([keys, description]) => (
                                <div
                                    key={description}
                                    className="flex items-center justify-between gap-4 text-sm"
                                >
                                    <span>{description}</span>
                                    <KbdGroup>
                                        {keys.map((key) => (
                                            <Kbd key={key}>{key}</Kbd>
                                        ))}
                                    </KbdGroup>
                                </div>
                            ))}
                        </section>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
