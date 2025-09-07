-- Table: attendance_settings
CREATE TABLE public.attendance_settings (
    id integer NOT NULL,
    setting_key character varying(100) NOT NULL,
    setting_value text,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: comp_off_balances
CREATE TABLE public.comp_off_balances (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    year integer NOT NULL,
    total_earned numeric(5,1) DEFAULT 0,
    comp_off_taken numeric(5,1) DEFAULT 0,
    comp_off_remaining numeric(5,1) DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: company_emails
CREATE TABLE public.company_emails (
    id integer NOT NULL,
    user_id integer,
    manager_id character varying(100),
    company_email character varying(255) NOT NULL,
    is_primary boolean DEFAULT true,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_user_or_manager CHECK ((((user_id IS NOT NULL) AND (manager_id IS NULL)) OR ((user_id IS NULL) AND (manager_id IS NOT NULL))))
);

-- Table: contract_employees
CREATE TABLE public.contract_employees (
    id integer NOT NULL,
    employee_id character varying(100) NOT NULL,
    employee_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    department character varying(100),
    designation character varying(100),
    contract_start_date date,
    contract_end_date date,
    status character varying(50) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: departments
CREATE TABLE public.departments (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(20) NOT NULL,
    description text,
    manager_id integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: document_collection
CREATE TABLE public.document_collection (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    employee_name character varying(255) NOT NULL,
    emp_id character varying(100) NOT NULL,
    department character varying(100),
    join_date date NOT NULL,
    due_date date NOT NULL,
    document_name character varying(255) NOT NULL,
    document_type character varying(50) DEFAULT 'Required'::character varying NOT NULL,
    status character varying(50) DEFAULT 'Pending'::character varying,
    notes text,
    uploaded_file_url character varying(500),
    uploaded_file_name character varying(255),
    uploaded_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: document_templates
CREATE TABLE public.document_templates (
    id integer NOT NULL,
    document_name character varying(255) NOT NULL,
    document_type character varying(50) DEFAULT 'Required'::character varying NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    category character varying(50),
    is_required boolean DEFAULT false,
    allow_multiple boolean DEFAULT false
);

-- Table: employee_documents
CREATE TABLE public.employee_documents (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    document_type character varying(100) NOT NULL,
    document_category character varying(50) NOT NULL,
    file_name character varying(255) NOT NULL,
    file_url character varying(500) NOT NULL,
    file_size integer,
    mime_type character varying(100),
    is_required boolean DEFAULT false,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: employee_forms
CREATE TABLE public.employee_forms (
    id integer NOT NULL,
    employee_id integer,
    type character varying(50),
    form_data jsonb,
    files text[],
    status character varying(50) DEFAULT 'draft'::character varying,
    submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    reviewed_by integer,
    reviewed_at timestamp without time zone,
    review_notes text,
    assigned_manager character varying(100),
    manager2_name character varying(100),
    manager3_name character varying(100),
    draft_data jsonb,
    documents_uploaded jsonb
);

-- Table: employee_master
CREATE TABLE public.employee_master (
    id integer NOT NULL,
    employee_id character varying(100) NOT NULL,
    employee_name character varying(255) NOT NULL,
    company_email character varying(255) NOT NULL,
    manager_id character varying(100),
    manager_name character varying(100),
    type character varying(50) NOT NULL,
    role character varying(100),
    doj date NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying,
    department character varying(100),
    designation character varying(100),
    salary_band character varying(50),
    location character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    department_id integer,
    manager2_id character varying(100),
    manager2_name character varying(100),
    manager3_id character varying(100),
    manager3_name character varying(100)
);

-- Table: employee_notifications
CREATE TABLE public.employee_notifications (
    id integer NOT NULL,
    employee_id integer,
    notification_type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: expense_attachments
CREATE TABLE public.expense_attachments (
    id integer NOT NULL,
    expense_id integer NOT NULL,
    file_name character varying(255) NOT NULL,
    file_url character varying(500) NOT NULL,
    file_size integer,
    mime_type character varying(100),
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: expense_categories
CREATE TABLE public.expense_categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: expense_requests
CREATE TABLE public.expense_requests (
    id integer NOT NULL,
    employee_id integer,
    category_id integer,
    amount numeric(10,2) NOT NULL,
    description text,
    expense_date date NOT NULL,
    receipt_url text,
    status character varying(50) DEFAULT 'pending'::character varying,
    approved_by integer,
    approved_at timestamp without time zone,
    approval_notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT expense_requests_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'reimbursed'::character varying])::text[])))
);

-- Table: full_time_employees
CREATE TABLE public.full_time_employees (
    id integer NOT NULL,
    employee_id character varying(100) NOT NULL,
    employee_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    department character varying(100),
    designation character varying(100),
    status character varying(50) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: interns
CREATE TABLE public.interns (
    id integer NOT NULL,
    intern_id character varying(100) NOT NULL,
    intern_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    department character varying(100),
    designation character varying(100),
    status character varying(50) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: leave_type_balances
CREATE TABLE public.leave_type_balances (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    year integer NOT NULL,
    leave_type character varying(100) NOT NULL,
    total_allocated numeric(5,2) DEFAULT 0,
    leaves_taken numeric(5,2) DEFAULT 0,
    leaves_remaining numeric(5,2) DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: manager_employee_mapping
CREATE TABLE public.manager_employee_mapping (
    id integer NOT NULL,
    manager_id integer,
    employee_id integer,
    mapping_type character varying(50) DEFAULT 'primary'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: managers
CREATE TABLE public.managers (
    id integer NOT NULL,
    manager_id character varying(100) NOT NULL,
    manager_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    department character varying(100),
    designation character varying(100),
    status character varying(50) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: migration_log
CREATE TABLE public.migration_log (
    id integer NOT NULL,
    migration_name character varying(255) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(50) NOT NULL,
    details text
);

-- Table: monthly_leave_accruals
CREATE TABLE public.monthly_leave_accruals (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL,
    earned_leave_accrued numeric(3,2) DEFAULT 0,
    sick_leave_accrued numeric(3,2) DEFAULT 0,
    casual_leave_accrued numeric(3,2) DEFAULT 0,
    total_earned_leave numeric(5,2) DEFAULT 0,
    total_sick_leave numeric(5,2) DEFAULT 0,
    total_casual_leave numeric(5,2) DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: onboarded_employees
CREATE TABLE public.onboarded_employees (
    id integer NOT NULL,
    user_id integer,
    employee_id character varying(100),
    company_email character varying(255),
    manager_id character varying(100),
    manager_name character varying(100),
    assigned_by integer,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(50) DEFAULT 'pending_assignment'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    employee_type character varying(50)
);

-- Table: system_settings
CREATE TABLE public.system_settings (
    id integer NOT NULL,
    total_annual_leaves integer DEFAULT 27,
    allow_half_day boolean DEFAULT true,
    approval_workflow character varying(50) DEFAULT 'manager_then_hr'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
