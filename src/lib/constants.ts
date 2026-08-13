/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TriageSignalInput } from '../types';

export interface PresetScenario {
  id: string;
  title: string;
  category: 'work' | 'personal' | 'hybrid';
  channel: string;
  scenario_text: string;
  instruction?: string;
  description: string;
  metadata?: TriageSignalInput;
}

export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: 'preset-service',
    title: 'Bad Service / Business Problem',
    category: 'personal',
    channel: 'Email',
    description: 'Raising a complaint or issue regarding a poor business or service experience.',
    scenario_text: 'I experienced poor service, unexpected delays, or billing issues with a recent business booking or order. I want to raise a complaint, request resolution, and ask for appropriate compensation.',
    metadata: {
      calendar_events_count: 0,
      unread_email_count: 5,
      top_email_subject_lines: [
        'Complaint: Order #48291 Experience',
        'Follow-up on Service Disruption'
      ],
      context_type: 'personal'
    }
  },
  {
    id: 'preset-return',
    title: 'Product Return & Refund Request',
    category: 'personal',
    channel: 'Email',
    description: 'Requesting a return, replacement, or refund for an order or faulty item.',
    scenario_text: 'I purchased a product that was faulty, incorrect, or not as described, and I need to request a full refund or return outside standard processing.',
    metadata: {
      calendar_events_count: 0,
      unread_email_count: 3,
      top_email_subject_lines: [
        'Return Request: Item Defect Report',
        'Customer Support Refund Inquiry'
      ],
      context_type: 'personal'
    }
  },
  {
    id: 'preset-enquiry',
    title: 'General Inquiry & Info Request',
    category: 'personal',
    channel: 'Email',
    description: 'Asking a company or organisation for clear information or service details.',
    scenario_text: 'I need to make a general inquiry regarding service terms, appointment availability, or charges, and require a clear, written response.',
    metadata: {
      calendar_events_count: 1,
      unread_email_count: 4,
      top_email_subject_lines: [
        'General Inquiry: Account Terms & Pricing',
        'Information Request regarding Schedule'
      ],
      context_type: 'personal'
    }
  },
  {
    id: 'preset-facetoface',
    title: 'In-Person / Face-to-Face Boundary',
    category: 'hybrid',
    channel: 'Face-to-Face',
    description: 'Preparing what to say in-person when declining or negotiating a request.',
    scenario_text: 'I need a talking-points script for an in-person conversation to politely but firmly decline an immediate request and offer a manageable alternative.',
    metadata: {
      calendar_events_count: 3,
      unread_email_count: 8,
      top_email_subject_lines: [
        'Follow-up notes from quick catch-up',
        'Action items from team discussion'
      ],
      context_type: 'hybrid'
    }
  },
  {
    id: 'preset-phone-discussion',
    title: 'Phone Call / Telephone Boundary',
    category: 'work',
    channel: 'Phone Call',
    description: 'Preparing spoken talking points and telephone script for a direct call.',
    scenario_text: 'I need to call a colleague, manager, or client on the telephone to explain why I cannot fulfill an immediate request today and negotiate a realistic timeline verbally.',
    metadata: {
      calendar_events_count: 4,
      unread_email_count: 12,
      top_email_subject_lines: [
        'Urgent: Call regarding deliverable timeline',
        'Project update sync request'
      ],
      context_type: 'work'
    }
  },
  {
    id: 'preset-family',
    title: 'Personal & Family Boundary',
    category: 'personal',
    channel: 'WhatsApp',
    description: 'Politely declining social or family demands to protect rest and downtime.',
    scenario_text: 'My family or friends are pressing for an immediate commitment or weekend attendance, but my schedule is full and I need downtime.',
    metadata: {
      calendar_events_count: 2,
      unread_email_count: 6,
      top_email_subject_lines: [
        'Weekend Gathering Planning',
        'Dinner Confirmation'
      ],
      context_type: 'personal'
    }
  },
  {
    id: 'preset-workload',
    title: 'Workload & Deadline Conflict',
    category: 'work',
    channel: 'Email',
    description: 'Requesting a deadline extension or scope adjustment due to workload.',
    scenario_text: 'I received a new urgent task request at work, but my existing workload and meeting schedule mean I cannot complete it by the proposed deadline without compromising quality.',
    metadata: {
      calendar_events_count: 6,
      unread_email_count: 22,
      top_email_subject_lines: [
        'URGENT: New Project Deliverable Request',
        'Quarterly Review Sync'
      ],
      context_type: 'work'
    }
  },
  {
    id: 'preset-afterhours',
    title: 'After-Hours Communication Boundary',
    category: 'work',
    channel: 'Face-to-Face',
    description: 'Setting clear boundaries around late evening messages or calls.',
    scenario_text: 'I keep receiving non-urgent messages or pings outside my standard hours. I want to set a friendly but firm boundary for my personal evening time.',
    metadata: {
      calendar_events_count: 0,
      unread_email_count: 10,
      top_email_subject_lines: [
        'Quick question regarding project deck',
        'Evening updates'
      ],
      context_type: 'work'
    }
  }
];

export const FORBIDDEN_WORDS = ['stress', 'stressed', 'stressful', 'stressor'];

export const SYSTEM_DISCLAIMERS = {
  SENSITIVE_HR: 'Note: This query touches upon formal workplace grievances or contract terms. Please consult an HR representative, union steward, or legal advisor for specific contractual or employment guidance.',
  SEVERE_BURNOUT: 'Note: If you are experiencing physical exhaustion or health distress, please consider seeking support from a health professional or your workplace wellbeing advisor.',
  GENERAL_NOTE: 'Consider reviewing your calendar to convert non-essential meetings or personal commitments into asynchronous updates to protect your focus time.'
};
