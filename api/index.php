<?php
declare(strict_types=1);

/* Front controller for the Past Questions Bank API. Every request is routed from here.
   Access levels: public = anyone, admin = any signed-in admin, main = Main Admin only (enforced server-side). */

require __DIR__ . '/lib/bootstrap.php';
require __DIR__ . '/lib/auth.php';
require __DIR__ . '/lib/present.php';
require __DIR__ . '/lib/pdf.php';
require __DIR__ . '/lib/files.php';
foreach (['public', 'auth', 'admin', 'structure', 'users', 'leadership'] as $r) require __DIR__ . "/routes/$r.php";

dispatch([
    // Public
    ['GET',  '/public/meta',                   'pub_meta',             'public'],
    ['GET',  '/public/questions',              'pub_questions',        'public'],
    ['GET',  '/public/questions/{id}',         'pub_question',         'public'],
    ['GET',  '/public/questions/{id}/file',    'pub_file',             'public'],
    ['POST', '/public/requests',               'pub_request_create',   'public'],

    // Public leadership
    ['GET', '/public/leadership', 'pub_leadership', 'public'],
    ['GET', '/public/leadership/{id}/image', 'pub_leadership_image', 'public'],

    // Admin leadership management
    ['GET', '/admin/leadership', 'adm_leadership_list', 'admin'],
    ['POST', '/admin/leadership', 'adm_leadership_save', 'admin'],
    ['POST', '/admin/leadership/{id}', 'adm_leadership_save', 'admin'],
    ['DELETE', '/admin/leadership/{id}', 'adm_leadership_delete', 'admin'],

    // Authentication
    ['POST', '/auth/login',                    'auth_login',           'public'],
    ['GET',  '/auth/me',                       'auth_me',              'public'],
    ['POST', '/auth/logout',                   'auth_logout',          'public'],

    // Both roles
    ['GET',  '/admin/dashboard',               'adm_dashboard',        'admin'],
    ['GET',  '/admin/questions',               'adm_questions_list',   'admin'],
    ['POST', '/admin/questions',               'adm_question_save',    'admin'],
    ['GET',  '/admin/questions/{id}',          'adm_question_get',     'admin'],
    ['POST', '/admin/questions/{id}',          'adm_question_save',    'admin'],
    ['DELETE', '/admin/questions/{id}',        'adm_question_delete',  'admin'],
    ['POST', '/admin/questions/{id}/publish',  'adm_question_publish', 'admin'],
    ['POST', '/admin/questions/{id}/feature',  'adm_question_feature', 'admin'],
    ['GET',  '/admin/questions/{id}/file',     'adm_question_file',    'admin'],
    ['GET',  '/admin/requests',                'adm_requests_list',    'admin'],
    ['POST', '/admin/requests/{id}/status',    'adm_request_status',   'admin'],
    ['DELETE', '/admin/requests/{id}',         'adm_request_delete',   'admin'],
    ['GET',  '/admin/structure',               'adm_structure',        'admin'],

    // Main Admin only
    ['POST', '/admin/departments',             'struct_dept_create',   'main'],
    ['POST', '/admin/departments/reorder',     'struct_dept_reorder',  'main'],
    ['PUT',  '/admin/departments/{id}',        'struct_dept_update',   'main'],
    ['DELETE', '/admin/departments/{id}',      'struct_dept_delete',   'main'],
    ['POST', '/admin/programmes',              'struct_prog_create',   'main'],
    ['PUT',  '/admin/programmes/{id}',         'struct_prog_update',   'main'],
    ['DELETE', '/admin/programmes/{id}',       'struct_prog_delete',   'main'],
    ['POST', '/admin/levels',                  'struct_level_create',  'main'],
    ['PUT',  '/admin/levels/{id}',             'struct_level_update',  'main'],
    ['DELETE', '/admin/levels/{id}',           'struct_level_delete',  'main'],
    ['POST', '/admin/semesters',               'struct_sem_create',    'main'],
    ['PUT',  '/admin/semesters/{id}',          'struct_sem_update',    'main'],
    ['DELETE', '/admin/semesters/{id}',        'struct_sem_delete',    'main'],
    ['POST', '/admin/sessions',                'struct_sess_create',   'main'],
    ['PUT',  '/admin/sessions/{id}',           'struct_sess_update',   'main'],
    ['DELETE', '/admin/sessions/{id}',         'struct_sess_delete',   'main'],
    ['GET',  '/admin/users',                   'users_list',           'main'],
    ['POST', '/admin/users',                   'users_create',         'main'],
    ['PUT',  '/admin/users/{id}',              'users_update',         'main'],
    ['DELETE', '/admin/users/{id}',            'users_delete',         'main'],
]);