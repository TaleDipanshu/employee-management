export type LeadStatus = 'new' | 'follow-up' | 'enrolled' | 'not-interested' | 'contacted';
export type CommunicationType = 'call' | 'email';

export interface Communication {
    id: string;
    type: CommunicationType;
    message: string;
    date: string;
}

export interface Lead {
    id: string;
    name: string;
    email: string;
    phone: string;
    source: string;
    status: LeadStatus;
    assignedTo: string;
    createdDate: string;
    lastContact: string;
    notes: string;
    course: string;
    communications?: Communication[];
}
