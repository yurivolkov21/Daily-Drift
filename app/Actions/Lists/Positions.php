<?php

namespace App\Actions\Lists;

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
            if ($model->getAttribute('position') !== $position) {
                $model->setAttribute('position', $position);
                $model->save();
            }
        }
    }
}
