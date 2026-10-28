<?php

namespace App\Enums;

enum IssueLinkType: string
{
    case PullRequest = 'pull_request';
    case Commit = 'commit';
}
