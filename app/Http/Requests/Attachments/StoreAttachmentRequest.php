<?php

namespace App\Http\Requests\Attachments;

use App\Models\Attachment;
use App\Models\Task;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreAttachmentRequest extends FormRequest
{
    /**
     * One file per request. Its name must have an allowed extension and its
     * content an allowed type (spec 0010): an SVG or HTML file is refused,
     * whatever it is called.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'file' => [
                'required',
                'file',
                'max:'.Attachment::MAX_KILOBYTES,
                'extensions:'.implode(',', Attachment::EXTENSIONS),
                'mimetypes:'.implode(',', Attachment::TYPES),
            ],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->isEmpty() && $this->task()->attachments()->count() >= Attachment::LIMIT) {
                    $validator->errors()->add('file', __('A task holds up to :limit files.', ['limit' => Attachment::LIMIT]));
                }
            },
        ];
    }

    /**
     * Short reasons, shown on the file's row in the task sheet.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'file.uploaded' => __('The server refused the file. It may be larger than its upload limit.'),
            'file.max' => __('Larger than 10 MB.'),
            'file.extensions' => __("This type of file can't be attached."),
            'file.mimetypes' => __("This type of file can't be attached."),
        ];
    }

    private function task(): Task
    {
        $task = $this->route('task');

        return $task instanceof Task ? $task : throw new \LogicException('The route has no task.');
    }
}
