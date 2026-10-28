<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\Api\V1\ProjectResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProjectController extends Controller
{
    /**
     * List the team's projects by name.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        return ProjectResource::collection(
            $this->team($request)->projects()->orderBy('name')->get(),
        );
    }
}
