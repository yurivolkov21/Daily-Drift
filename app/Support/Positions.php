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
     * A model that only shifts because another one moved keeps its
     * `updated_at`: nobody changed it. The moved model, and any model with
     * other unsaved changes, is saved as usual.
     *
     * @param  Collection<int, covariant Model>  $models
     */
    public static function rewrite(Collection $models, ?Model $moved = null): void
    {
        foreach ($models->values() as $position => $model) {
            if ($model->getAttribute('position') === $position && ! $model->isDirty()) {
                continue;
            }

            $shiftedOnly = ! $model->isDirty() && ! ($moved !== null && $model->is($moved));
            $model->setAttribute('position', $position);

            if ($shiftedOnly) {
                $model->timestamps = false;
                $model->save();
                $model->timestamps = true;

                continue;
            }

            $model->save();
        }
    }
}
