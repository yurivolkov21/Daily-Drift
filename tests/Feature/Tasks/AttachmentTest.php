<?php

namespace Tests\Feature\Tasks;

use App\Actions\Projects\CreateProject;
use App\Actions\Tasks\CreateTask;
use App\Enums\Hue;
use App\Enums\TeamRole;
use App\Models\Activity;
use App\Models\Attachment;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskList;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Spec 0010: files on tasks.
 */
class AttachmentTest extends TestCase
{
    use RefreshDatabase;

    private Team $team;

    private User $owner;

    private User $member;

    private User $other;

    private Project $project;

    private TaskList $todo;

    private Task $task;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake();

        $this->team = Team::factory()->create();
        $this->owner = User::factory()->create();
        $this->member = User::factory()->create(['name' => 'Thu Linh']);
        $this->other = User::factory()->create();
        $this->team->members()->attach($this->owner, ['role' => TeamRole::Owner->value]);
        $this->team->members()->attach($this->member, ['role' => TeamRole::Member->value]);
        $this->team->members()->attach($this->other, ['role' => TeamRole::Member->value]);

        $this->project = app(CreateProject::class)->handle($this->team, $this->owner, ['name' => 'Board', 'color' => Hue::Indigo]);
        $this->todo = $this->project->lists()->where('name', 'To do')->sole();
        $this->task = app(CreateTask::class)->handle($this->todo, $this->owner, 'Release');
        Activity::query()->delete();
    }

    /**
     * @param  array<string, mixed>  $parameters
     */
    private function url(string $name, array $parameters = []): string
    {
        return route($name, ['current_team' => $this->team->slug, ...$parameters]);
    }

    /**
     * A file whose type is read from its content, as a real upload is.
     */
    private function upload(string $name, string $contents): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'upload');
        file_put_contents($path, $contents);

        return new UploadedFile($path, $name, null, null, true);
    }

    /**
     * A real 1×1 PNG, so no image library is needed to make one.
     */
    private function png(string $name = 'screen.png'): UploadedFile
    {
        return $this->upload($name, (string) base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='));
    }

    private function attach(UploadedFile $file, ?User $as = null, ?Task $task = null): Attachment
    {
        $this->actingAs($as ?? $this->member)
            ->post($this->url('attachments.store', ['task' => ($task ?? $this->task)->id]), ['file' => $file])
            ->assertSessionHasNoErrors();

        return Attachment::query()->latest('id')->firstOrFail();
    }

    public function test_a_file_is_stored_under_a_random_name_outside_public_with_its_details()
    {
        $file = $this->attach($this->upload('Sprint notes.pdf', "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n"));

        $this->assertSame('Sprint notes.pdf', $file->name);
        $this->assertSame('application/pdf', $file->mime_type);
        $this->assertGreaterThan(0, $file->size);
        $this->assertTrue($file->uploader->is($this->member));
        $this->assertStringStartsWith("attachments/{$this->team->id}/{$this->project->id}/{$this->task->id}/", $file->path);
        $this->assertStringNotContainsString('Sprint', $file->path);
        Storage::assertExists($file->path);

        $event = Activity::query()->sole();
        $this->assertSame(Activity::ATTACHMENT_ADDED, $event->type);
        $this->assertSame(['id' => $file->id, 'name' => 'Sprint notes.pdf'], $event->properties);
    }

    public function test_images_text_office_files_and_zip_are_accepted()
    {
        $this->attach($this->png());
        $this->attach($this->upload('notes.md', "# Notes\n\nPlain text.\n"));
        $this->attach($this->upload('data.csv', "a,b\n1,2\n"));
        $this->attach(UploadedFile::fake()->create('brief.docx', 20, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
        $this->attach(UploadedFile::fake()->create('budget.xlsx', 20, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'));
        $this->attach(UploadedFile::fake()->create('export.zip', 20, 'application/zip'));

        $this->assertSame(6, $this->task->attachments()->count());
    }

    public function test_svg_html_and_files_whose_content_is_not_allowed_are_refused()
    {
        $refused = [
            $this->upload('logo.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
            $this->upload('page.html', '<!doctype html><html><body><script>alert(1)</script></body></html>'),
            // Named like text, but the content is a web page.
            $this->upload('notes.txt', '<!doctype html><html><body><script>alert(1)</script></body></html>'),
            // Named like an image, but the content is a program.
            $this->upload('photo.png', "MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xFF\xFF\x00\x00".str_repeat("\x00", 64).'This program cannot be run in DOS mode.'),
        ];

        foreach ($refused as $file) {
            $this->actingAs($this->member)
                ->post($this->url('attachments.store', ['task' => $this->task->id]), ['file' => $file])
                ->assertSessionHasErrors(['file' => "This type of file can't be attached."]);
        }

        $this->assertSame(0, Attachment::query()->count());
        $this->assertSame([], Storage::allFiles());
        $this->assertSame(0, Activity::query()->count());
    }

    public function test_files_over_10_mb_and_a_21st_file_are_refused()
    {
        $this->actingAs($this->member)
            ->post($this->url('attachments.store', ['task' => $this->task->id]), ['file' => UploadedFile::fake()->create('big.pdf', 10 * 1024 + 1, 'application/pdf')])
            ->assertSessionHasErrors(['file' => 'Larger than 10 MB.']);

        foreach (range(1, 20) as $n) {
            $this->attach(UploadedFile::fake()->create("file-{$n}.pdf", 1, 'application/pdf'));
        }

        $this->actingAs($this->member)
            ->post($this->url('attachments.store', ['task' => $this->task->id]), ['file' => UploadedFile::fake()->create('one-more.pdf', 1, 'application/pdf')])
            ->assertSessionHasErrors('file');

        $this->assertSame(20, $this->task->attachments()->count());
        $this->assertCount(20, Storage::allFiles());
    }

    public function test_images_open_inline_and_other_files_download_with_safe_headers()
    {
        $image = $this->attach($this->png('screen.png'));
        $pdf = $this->attach($this->upload('Sprint notes.pdf', "%PDF-1.4\n%%EOF\n"));

        $this->actingAs($this->other)->get($this->url('attachments.show', ['attachment' => $image->id]))
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png')
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox")
            ->assertHeader('Content-Disposition', 'inline; filename=screen.png');

        $response = $this->actingAs($this->other)->get($this->url('attachments.show', ['attachment' => $pdf->id]))
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertDownload('Sprint notes.pdf');
        $this->assertStringContainsString('sandbox', (string) $response->headers->get('Content-Security-Policy'));
    }

    public function test_people_outside_the_team_get_not_found_even_through_their_own_team()
    {
        $file = $this->attach($this->png());
        $stranger = User::factory()->create();
        $theirs = Team::factory()->create();
        $theirs->members()->attach($stranger, ['role' => TeamRole::Owner->value]);

        $this->actingAs($stranger)->get($this->url('attachments.show', ['attachment' => $file->id]))->assertNotFound();
        $this->actingAs($stranger)->get(route('attachments.show', ['current_team' => $theirs->slug, 'attachment' => $file->id]))->assertNotFound();
        $this->actingAs($stranger)->delete(route('attachments.destroy', ['current_team' => $theirs->slug, 'attachment' => $file->id]))->assertNotFound();
        $this->actingAs($stranger)->post($this->url('attachments.store', ['task' => $this->task->id]), ['file' => $this->png()])->assertNotFound();

        Storage::assertExists($file->path);
    }

    public function test_the_uploader_owners_and_admins_delete_a_file_but_other_members_cannot()
    {
        $mine = $this->attach($this->png('mine.png'));
        $theirs = $this->attach($this->png('theirs.png'), $this->other);

        $this->actingAs($this->member)->delete($this->url('attachments.destroy', ['attachment' => $theirs->id]))->assertForbidden();
        Storage::assertExists($theirs->path);

        $this->actingAs($this->member)->delete($this->url('attachments.destroy', ['attachment' => $mine->id]))->assertSessionHasNoErrors();
        $this->actingAs($this->owner)->delete($this->url('attachments.destroy', ['attachment' => $theirs->id]))->assertSessionHasNoErrors();

        $this->assertSame(0, Attachment::query()->count());
        Storage::assertMissing($mine->path);
        Storage::assertMissing($theirs->path);

        $removed = Activity::query()->where('type', Activity::ATTACHMENT_REMOVED)->orderBy('id')->get();
        $this->assertSame([['name' => 'mine.png'], ['name' => 'theirs.png']], $removed->pluck('properties')->all());
    }

    public function test_files_leave_the_disk_with_their_task_list_project_and_team()
    {
        $other = app(CreateTask::class)->handle($this->todo, $this->owner, 'Other');
        $byTask = $this->attach($this->png(), task: $other);
        $this->actingAs($this->owner)->delete($this->url('tasks.destroy', ['task' => $other->id]));
        Storage::assertMissing($byTask->path);

        $doing = $this->project->lists()->where('name', 'In progress')->sole();
        $inList = app(CreateTask::class)->handle($doing, $this->owner, 'In a list');
        $byList = $this->attach($this->png(), task: $inList);
        $this->actingAs($this->owner)->delete($this->url('lists.destroy', ['list' => $doing->id]));
        Storage::assertMissing($byList->path);

        $byProject = $this->attach($this->png());
        $this->actingAs($this->owner)->delete($this->url('projects.destroy', ['project' => $this->project->id]));
        Storage::assertMissing($byProject->path);

        $second = app(CreateProject::class)->handle($this->team, $this->owner, ['name' => 'Second', 'color' => Hue::Teal]);
        $last = app(CreateTask::class)->handle($second->lists()->first(), $this->owner, 'Last');
        $byTeam = $this->attach($this->png(), task: $last);
        $this->team->delete();
        Storage::assertMissing($byTeam->path);
        $this->assertSame(0, Attachment::query()->count());
    }

    public function test_an_archived_projects_files_can_be_downloaded_but_not_changed()
    {
        $file = $this->attach($this->png());
        $this->project->update(['archived_at' => now()]);

        $this->actingAs($this->member)->get($this->url('attachments.show', ['attachment' => $file->id]))->assertOk();
        $this->actingAs($this->member)->post($this->url('attachments.store', ['task' => $this->task->id]), ['file' => $this->png()])->assertForbidden();
        $this->actingAs($this->owner)->delete($this->url('attachments.destroy', ['attachment' => $file->id]))->assertForbidden();

        Storage::assertExists($file->path);
    }

    public function test_uploads_are_limited_to_30_a_minute_per_person()
    {
        foreach (range(1, 30) as $n) {
            $this->actingAs($this->member)->post($this->url('attachments.store', ['task' => $this->task->id]), ['file' => 'not a file']);
        }

        $this->actingAs($this->member)
            ->post($this->url('attachments.store', ['task' => $this->task->id]), ['file' => $this->png()])
            ->assertTooManyRequests();

        $this->actingAs($this->other)
            ->post($this->url('attachments.store', ['task' => $this->task->id]), ['file' => $this->png()])
            ->assertSessionHasNoErrors();
    }

    public function test_the_board_carries_each_tasks_files()
    {
        $this->attach($this->png('screen.png'));

        $this->actingAs($this->member)
            ->get($this->url('projects.show', ['project' => $this->project->id]))
            ->assertInertia(fn ($page) => $page
                ->where('project.lists.0.tasks.0.attachments.0.name', 'screen.png')
                ->where('project.lists.0.tasks.0.attachments.0.isImage', true)
                ->where('project.lists.0.tasks.0.attachments.0.uploaderName', 'Thu Linh')
                ->where('project.can.deleteAnyFile', false));

        $this->actingAs($this->owner)
            ->get($this->url('projects.show', ['project' => $this->project->id]))
            ->assertInertia(fn ($page) => $page->where('project.can.deleteAnyFile', true));
    }
}
