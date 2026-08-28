import express, { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { fetchMessageRaw, extractSnippetFromGmailMessage } from './gmailClient.js';
import { listEmails, saveEmail, markActionRequired as dbMarkAction } from '../db/index.js';
import { getTokenByUserId } from '../db/index.js';
import { fetch } from 'undici';
import { v4 as uuidv4 } from 'uuid';
import { postProcessText } from '../ai/postProcess.js';

const router = express.Router();

function getGeminiAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set in environment variables. Using fallback behaviour.');
  }
  return new GoogleGenAI({ apiKey: apiKey || 'DUMMY_KEY', httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
}

function fewShotExamples(mode: 'reply' | 'compose') {
  if (mode === 'reply') {
    return `Example 1 (reply):\nOption A:\nHi Sam,\nThanks — I can take that on. I\'ll get it done by Friday and let you know if anything changes.\n\nOption B:\nHi Sam,\nQuick one: can you confirm the final price? Once I have that I\'ll confirm.\n\nOption C:\nHi Sam,\nI\'m happy to help — is there anything you want prioritised?`;
  }
  return `Example 1 (compose):\nOption A:\nHi Alice,\nJust checking if we can move the meeting to Tuesday — I\'m travelling this week. I\'m free 10am or 2pm.\n\nOption B:\nHi Alice,\nCould we please shift our meeting to next Tue? I have time at 10am or 2pm.\n\nOption C:\nHi Alice,\nI\'m away this week — could we look at Tuesday instead?`; 
}

// ... rest of file unchanged
export default router;
