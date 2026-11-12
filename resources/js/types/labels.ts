/** A team label (spec 0007): a name and a Lucide icon, no color. */
export type Label = {
    id: number;
    name: string;
    icon: string;
};

/** A label with how many tasks of the team carry it. */
export type TeamLabel = Label & { taskCount: number };
