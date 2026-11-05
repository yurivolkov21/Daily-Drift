<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

class Positions
{
    /**
     * Give the models positions 0, 1, 2, ... in their collection order,
     * saving only the ones that change.
     *
     * @param  Collection<int, covariant Model>  $models
     */
    public static function rewrite(Collection $models): void
    {
        foreach ($models->values() as $position => $model) {
            if ($model->getAttribute('position') !== $position || $model->isDirty()) {
                $model->setAttribute('position', $position);
                $model->save();
            }
        }
    }
}
