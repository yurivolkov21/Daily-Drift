<?php

namespace App\Support;

use App\Enums\RepeatUnit;
use Carbon\CarbonImmutable;

/**
 * A repeat rule and its schedule (spec 0010): every 1 to 30 days, weeks,
 * months or years, or every weekday.
 */
final readonly class RepeatRule
{
    public const int MAX_EVERY = 30;

    public function __construct(
        public RepeatUnit $unit,
        public int $every = 1,
    ) {
        //
    }

    /**
     * The first date on the schedule after the old due date that is not
     * already past. A task done three weeks late lands on the coming week,
     * not on three overdue copies.
     *
     * Months and years keep the anchor's day: a task on the 31st falls on
     * the last day of shorter months and comes back to the 31st.
     */
    public function nextDue(CarbonImmutable $due, CarbonImmutable $anchor, CarbonImmutable $today): CarbonImmutable
    {
        $next = $this->step($due, $anchor);

        while ($next->lt($today->startOfDay())) {
            $next = $this->step($next, $anchor);
        }

        return $next;
    }

    /**
     * One step on the schedule.
     */
    public function step(CarbonImmutable $date, CarbonImmutable $anchor): CarbonImmutable
    {
        $date = $date->startOfDay();

        return match ($this->unit) {
            RepeatUnit::Day => $date->addDays($this->every),
            RepeatUnit::Weekday => $date->addWeekday(),
            RepeatUnit::Week => $date->addWeeks($this->every),
            RepeatUnit::Month => $this->onAnchorDay($date->startOfMonth()->addMonthsNoOverflow($this->every), $anchor->day),
            RepeatUnit::Year => $this->onAnchorDay($date->setDate($date->year + $this->every, $anchor->month, 1), $anchor->day),
        };
    }

    /**
     * @return array{unit: string, every: int}
     */
    public function toArray(): array
    {
        return ['unit' => $this->unit->value, 'every' => $this->every];
    }

    private function onAnchorDay(CarbonImmutable $month, int $day): CarbonImmutable
    {
        return $month->setDay(min($day, $month->daysInMonth));
    }
}
