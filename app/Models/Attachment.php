<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * A file attached to a task (spec 0010).
 *
 * @property int $id
 * @property int $task_id
 * @property int|null $user_id
 * @property string $name
 * @property string $path
 * @property string $mime_type
 * @property int $size
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Task $task
 * @property-read User|null $uploader
 */
#[Fillable(['name', 'path', 'mime_type', 'size'])]
class Attachment extends Model
{
    /**
     * The most files a task holds.
     */
    public const int LIMIT = 20;

    /**
     * The largest file, in kilobytes (10 MB).
     */
    public const int MAX_KILOBYTES = 10 * 1024;

    /**
     * Images, shown inline and as thumbnails.
     *
     * @var list<string>
     */
    public const array IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

    /**
     * The types a file's content may have. SVG and HTML are not among them:
     * opened in a browser, they can run scripts.
     *
     * @var list<string>
     */
    public const array TYPES = [
        ...self::IMAGE_TYPES,
        'application/pdf',
        'text/plain',
        'text/csv',
        'application/csv',
        'text/markdown',
        'text/x-markdown',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/zip',
        'application/x-zip-compressed',
    ];

    /**
     * The extensions a file's name may have.
     *
     * @var list<string>
     */
    public const array EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'txt', 'csv', 'md', 'markdown', 'docx', 'xlsx', 'pptx', 'zip'];

    /**
     * Changing a task's files counts as an update of the task.
     *
     * @var list<string>
     */
    protected $touches = ['task'];

    /**
     * @return BelongsTo<Task, $this>
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * Who attached the file.
     *
     * @return BelongsTo<User, $this>
     */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function isImage(): bool
    {
        return in_array($this->mime_type, self::IMAGE_TYPES, true);
    }

    /**
     * The folder of a task's files: one per team, project and task, so a
     * whole team's, project's or task's files leave the disk together.
     */
    public static function directory(int $teamId, ?int $projectId = null, ?int $taskId = null): string
    {
        return implode('/', array_filter(['attachments', $teamId, $projectId, $taskId], fn ($part) => $part !== null));
    }

    public static function directoryFor(Task $task): string
    {
        $task->loadMissing('project');

        return self::directory($task->project->team_id, $task->project_id, $task->id);
    }

    /**
     * Delete a folder of files once the database change that removed their
     * rows is committed, so a rolled-back delete keeps its files.
     */
    public static function deleteDirectoryLater(string $directory): void
    {
        DB::afterCommit(fn () => Storage::deleteDirectory($directory));
    }
}
