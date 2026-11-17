<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Trusted Proxies
    |--------------------------------------------------------------------------
    |
    | Spec 0012: the proxies whose X-Forwarded-* headers give the visitor's
    | address and the scheme, as a comma-separated list of addresses or
    | ranges. "*" trusts the proxy that made the request, which is right
    | on Render, where every request comes through Render's proxy. Leave
    | it empty when nothing stands in front of the app.
    |
    */

    'proxies' => env('TRUSTED_PROXIES'),

];
