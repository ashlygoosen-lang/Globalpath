import { z } from 'zod';

/** Express middleware: validates req.body against a zod schema and replaces it with the parsed value. */
export const validate = schema => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const fields = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || 'form';
      if (!fields[key]) fields[key] = issue.message;
    }
    return res.status(422).json({ error: 'Some details need attention.', fields });
  }
  req.body = result.data;
  next();
};

const trimmed = (min, max, label) =>
  z.string({ required_error: `${label} is required.` }).trim()
    .min(min, min > 1 ? `${label} needs at least ${min} characters.` : `${label} is required.`)
    .max(max, `${label} must be under ${max} characters.`);

export const email = z.string({ required_error: 'Email is required.' }).trim().toLowerCase().email('Enter a valid email address.').max(160);
export const phone = z.string().trim().max(30).regex(/^[+()\d\s-]*$/, 'Use digits, spaces and + only.').optional().or(z.literal(''));
export const text = trimmed;
export { z };
