<?php

namespace App\Notifications;

/**
 * Someone else assigned a task to you.
 */
class TaskAssigned extends TeamNotification
{
    public const string KIND = 'assigned';
}
