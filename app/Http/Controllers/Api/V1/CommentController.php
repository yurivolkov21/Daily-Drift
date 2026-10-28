<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Issues\AddComment;
use App\Http\Requests\Issues\SaveCommentRequest;
use App\Http\Resources\Api\V1\CommentResource;
use Illuminate\Http\JsonResponse;

class CommentController extends Controller
{
    /**
     * Add a comment to the given issue as the token's owner.
     */
    public function store(SaveCommentRequest $request, string $identifier, AddComment $addComment): JsonResponse
    {
        $issue = $this->team($request)->issues()->identifiedBy($identifier)->firstOrFail();

        $comment = $addComment->handle($request->user(), $issue, $request->safe()->string('body')->toString());

        return CommentResource::make($comment->load('author'))
            ->response()
            ->setStatusCode(201);
    }
}
