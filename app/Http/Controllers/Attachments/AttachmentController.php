<?php

namespace App\Http\Controllers\Attachments;

use App\Http\Controllers\Controller;
use App\Http\Requests\Attachments\StoreAttachmentRequest;
use App\Models\Activity;
use App\Models\Attachment;
use App\Models\Task;
use App\Models\Team;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

/**
 * Files on tasks (spec 0010). They live on the default disk, never under
 * public/, and are only sent through this controller.
 */
class AttachmentController extends Controller
{
    /**
     * A file is sent with its type and these headers: the browser must not
     * guess another type, and nothing in it may run scripts.
     *
     * @var array<string, string>
     */
    private const array SAFE_HEADERS = [
        'X-Content-Type-Options' => 'nosniff',
        'Content-Security-Policy' => "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    ];

    /**
     * Attach one file to the task, under a random name in the task's folder.
     */
    public function store(StoreAttachmentRequest $request, Team $current_team, Task $task): RedirectResponse
    {
        Gate::authorize('create', [Attachment::class, $task]);

        /** @var UploadedFile $file */
        $file = $request->file('file');
        $path = $file->store(Attachment::directoryFor($task));

        abort_if($path === false, 500, __('The file could not be stored.'));

        try {
            DB::transaction(function () use ($request, $task, $file, $path) {
                $attachment = $task->attachments()->make([
                    'name' => $this->nameOf($file),
                    'path' => $path,
                    'mime_type' => (string) $file->getMimeType(),
                    'size' => (int) $file->getSize(),
                ]);
                $attachment->uploader()->associate($request->user());
                $attachment->save();

                Activity::record($task, Activity::ATTACHMENT_ADDED, ['id' => $attachment->id, 'name' => $attachment->name]);
            });
        } catch (Throwable $exception) {
            Storage::delete($path);

            throw $exception;
        }

        return back();
    }

    /**
     * Send the file: an image inline, anything else as a download under the
     * name it was attached with.
     */
    public function show(Team $current_team, Attachment $attachment): StreamedResponse
    {
        $this->ensureInTeam($current_team, $attachment);
        Gate::authorize('view', $attachment);

        abort_unless(Storage::exists($attachment->path), 404);

        $headers = [...self::SAFE_HEADERS, 'Content-Type' => $attachment->mime_type];

        return $attachment->isImage()
            ? Storage::response($attachment->path, $attachment->name, $headers)
            : Storage::download($attachment->path, $attachment->name, $headers);
    }

    /**
     * Delete the file from the task and from the disk. It cannot be undone.
     */
    public function destroy(Team $current_team, Attachment $attachment): RedirectResponse
    {
        $this->ensureInTeam($current_team, $attachment);
        Gate::authorize('delete', $attachment);

        DB::transaction(function () use ($attachment) {
            $attachment->delete();

            Activity::record($attachment->task, Activity::ATTACHMENT_REMOVED, ['name' => $attachment->name]);

            DB::afterCommit(fn () => Storage::delete($attachment->path));
        });

        return back();
    }

    /**
     * A file of another team is not found, like its project (ADR 0006).
     */
    private function ensureInTeam(Team $team, Attachment $attachment): void
    {
        abort_unless($attachment->task->project->team_id === $team->id, 404);
    }

    /**
     * The name the file was attached with, without path parts or control
     * characters, and at most 255 characters with its extension kept.
     */
    private function nameOf(UploadedFile $file): string
    {
        $name = trim((string) preg_replace('/[\x00-\x1F\x7F\/\\\\]+/u', ' ', $file->getClientOriginalName()));
        $name = $name === '' ? 'file' : $name;

        if (mb_strlen($name) <= 255) {
            return $name;
        }

        $extension = $file->getClientOriginalExtension();
        $base = mb_substr($name, 0, 254 - mb_strlen($extension));

        return $extension === '' ? mb_substr($name, 0, 255) : "{$base}.{$extension}";
    }
}
