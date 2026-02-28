export const initialData: any = {
  profiles: [
    {
      "id": "aae32bc8-7c68-4180-9df0-bf59ea7c52b8",
      "username": "admin123",
      "email": "admin123@miaoda.com",
      "full_name": "Rakshit",
      "role": "admin",
      "department": "Owner",
      "is_active": true
    },
    {
      "id": "758e48c2-37a4-48dc-ac5b-c32831beac0b",
      "username": "shyam123",
      "email": "shyam123@miaoda.com",
      "full_name": "Shyam",
      "role": "employee",
      "department": "Devloper",
      "is_active": true
    },
    {
      "id": "5c9cd0ae-be7e-42d4-a2ee-f983dca19d40",
      "username": "hemal",
      "email": "hemal@miaoda.com",
      "full_name": "Hemal ",
      "role": "hr",
      "department": "HR",
      "is_active": true
    },
    {
      "id": "e5c59251-9f1e-435d-bd1f-5feaf51e2884",
      "username": "manav123",
      "email": "manav123@miaoda.com",
      "full_name": "Manav Jotangiya",
      "role": "employee",
      "department": "Devloper",
      "is_active": true
    },
    {
      "id": "1c134613-5ace-4bb6-bc98-243ea91b6619",
      "username": "parth",
      "email": "parth@miaoda.com",
      "full_name": "Parth P",
      "role": "employee",
      "department": "Engineering",
      "designation_id": "900e2a3c-d3ac-4bb3-b6be-6686f4679dda",
      "client_id": "fddb2f11-a796-4d71-8c2d-3ad100067fe7",
      "is_active": true
    },
    {
      "id": "0d42f635-791b-44fa-8b6a-3ea40f8b95c2",
      "username": "error",
      "email": "error@miaoda.com",
      "full_name": "errorinfotech",
      "role": "client",
      "client_id": "fddb2f11-a796-4d71-8c2d-3ad100067fe7",
      "is_active": true
    }
  ],
  clients: [
    {
      "id": "fddb2f11-a796-4d71-8c2d-3ad100067fe7",
      "company_name": "error",
      "contact_person": "manav",
      "email": "manav@gmail.com",
      "phone": "1236547990",
      "address": "rajkot",
      "status": "active"
    }
  ],
  tasks: [
    {
      "id": "98f8de6e-8d63-4a28-8331-e9776e40e216",
      "title": "Pdf Bnava",
      "description": "Jaldi",
      "priority": "high",
      "status": "in_progress",
      "deadline": "2026-02-12T05:39:00Z",
      "assigned_to": "758e48c2-37a4-48dc-ac5b-c32831beac0b"
    },
    {
      "id": "61555c19-1bdb-4baf-9a5f-feb8eb900cc5",
      "title": "PPt",
      "description": "Bnavo",
      "priority": "medium",
      "status": "pending",
      "deadline": "2026-02-16T14:40:00Z",
      "assigned_to": "e5c59251-9f1e-435d-bd1f-5feaf51e2884"
    }
  ],
  attendance: [
    {
      "id": "4dfc801b-40ed-479d-b45c-1c81661ec040",
      "user_id": "758e48c2-37a4-48dc-ac5b-c32831beac0b",
      "date": "2026-02-10",
      "clock_in": "2026-02-10T10:00:00Z",
      "clock_out": "2026-02-10T20:03:00Z"
    },
    {
      "id": "fac311d9-25f1-4c6e-aaf5-14e0d8f7ed3c",
      "user_id": "758e48c2-37a4-48dc-ac5b-c32831beac0b",
      "date": "2026-02-12",
      "clock_in": "2026-02-12T10:05:00Z",
      "clock_out": "2026-02-12T20:41:00Z"
    }
  ],
  leaves: [
    {
      "id": "dfc38189-d2f5-477e-ade7-d5cda0337ead",
      "user_id": "758e48c2-37a4-48dc-ac5b-c32831beac0b",
      "leave_type": "personal",
      "start_date": "2026-02-13",
      "end_date": "2026-02-14",
      "reason": "Sick Leave",
      "status": "approved"
    }
  ],
  departments: [
    { "id": "dept-1", "name": "Engineering" },
    { "id": "dept-2", "name": "Human Resources" },
    { "id": "dept-3", "name": "Sales" }
  ],
  designations: [
    { "id": "900e2a3c-d3ac-4bb3-b6be-6686f4679dda", "name": "Software Engineer", "department_id": "dept-1" }
  ],
  system_settings: [{
    id: "6b2f19e9-9b4b-4abd-b964-f039abcf5b07",
    company_name: "Error Infotech",
    company_email: "errorinfotech404@gmail.com",
    company_phone: "9898869189",
    company_address: "Rajkot",
    work_start_time: "10:00:00",
    work_end_time: "19:00:00",
    lunch_start_time: "13:00:00",
    lunch_end_time: "14:00:00",
    work_hours_per_day: 8.00,
    late_threshold_minutes: 0,
    updated_at: "2026-02-10T07:17:13Z"
  }]
};
