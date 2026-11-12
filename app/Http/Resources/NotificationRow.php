<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Notifications\DatabaseNotification;

/**
 * A notification already turned into its row. It stays a resource around
 * the model so the cursor paginator can still read `created_at` and `id`
 * for the next page.
 *
 * @property DatabaseNotification $resource
 */
class NotificationRow extends JsonResource
{
    /**
     * The row is the item itself, not wrapped in `data`.
     *
     * @var string|null
     */
    public static $wrap = null;

    /**
     * @param  array<string, mixed>  $row
     */
    public function __construct(DatabaseNotification $notification, private readonly array $row)
    {
        parent::__construct($notification);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return $this->row;
    }
}
