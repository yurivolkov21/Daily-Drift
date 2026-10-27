<?php

namespace App\Enums;

enum IssueActivityType: string
{
    case Created = 'created';
    case TitleChanged = 'title_changed';
    case DescriptionChanged = 'description_changed';
    case StatusChanged = 'status_changed';
    case PriorityChanged = 'priority_changed';
    case AssigneeChanged = 'assignee_changed';
    case DueDateChanged = 'due_date_changed';
    case LabelsChanged = 'labels_changed';
}
