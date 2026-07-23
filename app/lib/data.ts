import { sql } from '@vercel/postgres';
import {
  CustomerField,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  Revenue,
  GolfersTable,
  GolfersJSONTable,
} from './definitions';
import { formatCurrency } from './utils';

export async function fetchRevenue() {
  try {
    // Artificially delay a response for demo purposes.
    // Don't do this in production :)

     console.log('Fetching revenue data...');
     await new Promise((resolve) => setTimeout(resolve, 3000));
 
    const data = await sql<Revenue>`SELECT * FROM revenue`;

     console.log('Data fetch completed after 3 seconds.');

    return data.rows;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices() {
  try {
    const data = await sql<LatestInvoiceRaw>`
      SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      ORDER BY invoices.date DESC
      LIMIT 5`;

    const latestInvoices = data.rows.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData() {
  try {
    // You can probably combine these into a single SQL query
    // However, we are intentionally splitting them to demonstrate
    // how to initialize multiple queries in parallel with JS.
    const numberOfGolfersPromise = sql`SELECT COUNT(*) FROM golfers WHERE name IS DISTINCT FROM 'RANDO'`;
    const numberOfPrizesPromise = sql`SELECT COUNT(*) FROM prizes`;
    const numberOfTicketsPromise = sql`SELECT SUM(amount) FROM awards`;

    const data = await Promise.all([
      new Promise(resolve => setTimeout(resolve, 5000)),
      numberOfGolfersPromise,
      numberOfPrizesPromise,
      numberOfTicketsPromise,
    ]);

    const numberOfGolfers = Number(data[1].rows[0].count ?? '0');
    const numberOfPrizes = Number(data[2].rows[0].count ?? '0');
    const numberOfTickets = Number(data[3].rows[0].sum ?? '0');

    return {
      numberOfGolfers,
      numberOfPrizes,
      numberOfTickets,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const invoices = await sql<InvoicesTable>`
      SELECT
        invoices.id,
        invoices.amount,
        invoices.date,
        invoices.status,
        customers.name,
        customers.email,
        customers.image_url
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE
        customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`} OR
        invoices.amount::text ILIKE ${`%${query}%`} OR
        invoices.date::text ILIKE ${`%${query}%`} OR
        invoices.status ILIKE ${`%${query}%`}
      ORDER BY invoices.date DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `;

    return invoices.rows;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoicesPages(query: string) {
  try {
    const count = await sql`SELECT COUNT(*)
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE
      customers.name ILIKE ${`%${query}%`} OR
      customers.email ILIKE ${`%${query}%`} OR
      invoices.amount::text ILIKE ${`%${query}%`} OR
      invoices.date::text ILIKE ${`%${query}%`} OR
      invoices.status ILIKE ${`%${query}%`}
  `;

    const totalPages = Math.ceil(Number(count.rows[0].count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function fetchInvoiceById(id: string) {
  try {
    const data = await sql<InvoiceForm>`
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status
      FROM invoices
      WHERE invoices.id = ${id};
    `;

    const invoice = data.rows.map((invoice) => ({
      ...invoice,
      // Convert amount from cents to dollars
      amount: invoice.amount / 100,
    }));
    console.log(invoice); // Invoice is an empty array []

    return invoice[0];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

export async function fetchCustomers() {
  try {
    const data = await sql<CustomerField>`
      SELECT
        id,
        name
      FROM customers
      ORDER BY name ASC
    `;

    const customers = data.rows;
    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}


export async function fetchGolfers(
  
) {

  try {
    const golfers = await sql<GolfersTable>`
      SELECT golfers.*, nicknames.nickname from golfers LEFT JOIN nicknames on (golfers.id = nicknames.golfer_id)
WHERE nicknames.default_ind = TRUE AND golfers.name IS DISTINCT FROM 'RANDO' `;

    return golfers.rows;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch golfers.');
  }
}



export async function fetchJsonGolfers(
    
  ) {
  
    try {
      const golfers = await sql<GolfersJSONTable>`
    SELECT g.*, json_agg(n) as nicknames
    FROM
      golfers g
      LEFT JOIN nicknames n ON n.golfer_id = g.id
    WHERE g.name IS DISTINCT FROM 'RANDO'
    GROUP BY
      g.id `;
  
      return golfers.rows;
    } catch (error) {
      console.error('Database Error:', error);
      throw new Error('Failed to fetch golfers.');
    }
  }


  export async function fetchJsonGolfersWithAllocations(
    
  ) {
  
    try {
      const golfers = await sql<GolfersJSONTable>`
            SELECT g.*, json_agg(n) as nicknames
    FROM
      golfers g
      LEFT JOIN nicknames n ON n.golfer_id = g.id
      INNER JOIN allocations a ON g.id = a.golfer_id
    GROUP BY
      g.id `;
  
      return golfers.rows;
    } catch (error) {
      console.error('Database Error:', error);
      throw new Error('Failed to fetch golfers.');
    }
  }

export async function fetchGolfersWithAllocations(
  
) {

  try {
    const golfers = await sql<GolfersTable>`
    SELECT DISTINCT g.*
FROM golfers g
INNER JOIN allocations a ON g.id = a.golfer_id`;
 
    return golfers.rows;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch golfers.');
  }
}