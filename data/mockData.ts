import { Customer } from '../types';

export const INITIAL_CUSTOMERS: Customer[] = [
  { 
    id: "1", 
    name: "Alice Johnson", 
    email: "alice@example.com", 
    mobile: "(555) 010-1234", 
    status: "Active", 
    cards: [
      { 
        id: "c1", 
        uniqueId: "u1", 
        campaignId: "camp-001", 
        campaignName: "Cookie Classic", 
        stamps: 4, 
        lastVisit: "2023-10-25", 
        status: "Active",
        history: [
            { id: "tx1", type: "issued", amount: 0, date: "Oct 1, 2023, 10:00 AM", timestamp: 1696154400000, title: "Card Issued" },
            { id: "tx2", type: "stamp_add", amount: 1, date: "Oct 5, 2023, 2:30 PM", timestamp: 1696516200000, title: "Stamp Collected" },
            { id: "tx3", type: "stamp_add", amount: 1, date: "Oct 12, 2023, 9:15 AM", timestamp: 1697102100000, title: "Stamp Collected" },
            { id: "tx4", type: "stamp_add", amount: 1, date: "Oct 19, 2023, 11:00 AM", timestamp: 1697713200000, title: "Stamp Collected" },
            { id: "tx5", type: "stamp_add", amount: 1, date: "Oct 25, 2023, 4:45 PM", timestamp: 1698252300000, title: "Stamp Collected" }
        ]
      }
    ]
  },
  { 
    id: "2", 
    name: "Bob Smith", 
    email: "bob@example.com", 
    status: "Active", 
    cards: [
      { 
        id: "c2", 
        uniqueId: "u2", 
        campaignId: "camp-002", 
        campaignName: "Pizza Party", 
        stamps: 8, 
        lastVisit: "2023-10-24", 
        status: "Active",
        history: [
             { id: "tx_b1", type: "issued", amount: 0, date: "Sep 15, 2023, 12:00 PM", timestamp: 1694779200000, title: "Card Issued" },
             { id: "tx_b2", type: "stamp_add", amount: 8, date: "Oct 24, 2023, 6:00 PM", timestamp: 1698170400000, title: "Bulk Add (Manual)" }
        ]
      }
    ]
  },
  { 
    id: "3", 
    name: "Charlie Brown", 
    email: "charlie@example.com", 
    mobile: "(555) 010-5678", 
    status: "Inactive", 
    cards: [
       { 
         id: "c3", 
         uniqueId: "u3", 
         campaignId: "camp-001", 
         campaignName: "Cookie Classic", 
         stamps: 0, 
         lastVisit: "2023-09-15", 
         status: "Active",
         history: [
            { id: "tx_c1", type: "issued", amount: 0, date: "Sep 15, 2023, 09:30 AM", timestamp: 1694770200000, title: "Card Issued" }
         ]
       }
    ]
  },
  { 
    id: "4", 
    name: "Diana Prince", 
    email: "diana@example.com", 
    status: "Active", 
    cards: [
       { 
         id: "c4", 
         uniqueId: "u4", 
         campaignId: "camp-001", 
         campaignName: "Cookie Classic", 
         stamps: 2, 
         lastVisit: "2023-10-26", 
         status: "Active",
         history: []
       },
       { 
         id: "c5", 
         uniqueId: "u5", 
         campaignId: "camp-002", 
         campaignName: "Pizza Party", 
         stamps: 5, 
         lastVisit: "2023-10-20", 
         status: "Active",
         history: []
       }
    ]
  }
];