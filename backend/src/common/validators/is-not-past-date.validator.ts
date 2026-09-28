import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function IsNotPastDate(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isNotPastDate',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions || {
        message: `${propertyName} must be today or a future date (format YYYY-MM-DD)`,
      },
      validator: {
        validate(value: any, _args: ValidationArguments) {
          if (typeof value !== 'string') return false;

          // Check format YYYY-MM-DD
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(value)) return false;

          const [year, month, day] = value.split('-').map(Number);
          const inputDate = new Date(year, month - 1, day);

          // Verify if it is a valid calendar date
          if (
            inputDate.getFullYear() !== year ||
            inputDate.getMonth() !== month - 1 ||
            inputDate.getDate() !== day
          ) {
            return false;
          }

          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

          return inputDate.getTime() >= today.getTime();
        },
      },
    });
  };
}
