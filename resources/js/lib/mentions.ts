/**
 * How a comment body stores a mention: "@[Ada Lovelace](user:12)". The name
 * is kept as it read when written, and the id links to the person. The
 * server reads the same format (Comment::MENTION_PATTERN).
 */
const MENTION_PATTERN = /@\[([^\]\n]+)\]\(user:(\d+)\)/g;

export type Mention = { id: number; name: string };

/**
 * Split a stored body into text and mentions, to show the mentions as chips.
 */
export function splitMentions(body: string): Array<string | Mention> {
    const parts: Array<string | Mention> = [];
    let end = 0;

    for (const match of body.matchAll(MENTION_PATTERN)) {
        if (match.index > end) {
            parts.push(body.slice(end, match.index));
        }

        parts.push({ id: Number(match[2]), name: match[1] });
        end = match.index + match[0].length;
    }

    if (end < body.length) {
        parts.push(body.slice(end));
    }

    return parts;
}

/**
 * Turn a stored body into what the comment box shows, "@Name", keeping the
 * people it mentions aside.
 */
export function readMentions(body: string): {
    text: string;
    mentions: Mention[];
} {
    const mentions: Mention[] = [];

    for (const match of body.matchAll(MENTION_PATTERN)) {
        if (!mentions.some(({ id }) => id === Number(match[2]))) {
            mentions.push({ id: Number(match[2]), name: match[1] });
        }
    }

    return { text: body.replace(MENTION_PATTERN, '@$1'), mentions };
}

const escapeRegExp = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Turn what the comment box shows back into a stored body: each "@Name"
 * that was picked from the list links to its person again.
 */
export function writeMentions(text: string, mentions: Mention[]): string {
    if (mentions.length === 0) {
        return text;
    }

    // Longer names first, so "@Dana Owens" is not read as "@Dana".
    const names = [...new Set(mentions.map(({ name }) => name))].sort(
        (a, b) => b.length - a.length,
    );
    const pattern = new RegExp(`@(${names.map(escapeRegExp).join('|')})`, 'g');

    return text.replace(pattern, (whole, name: string) => {
        const mention = mentions.find((candidate) => candidate.name === name);

        return mention ? `@[${mention.name}](user:${mention.id})` : whole;
    });
}
