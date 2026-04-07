const extractDateParts = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
  };
};

export const formatReservationDate = (value: string) => {
  const parts = extractDateParts(value);

  if (!parts) {
    return "Data indisponivel";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(parts.year, parts.month - 1, parts.day));
};

export const buildReservationDateTime = (dateValue: string, timeValue: string) => {
  const parts = extractDateParts(dateValue);

  if (!parts) {
    return null;
  }

  const [hours, minutes] = timeValue.split(":").map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return new Date(parts.year, parts.month - 1, parts.day, hours, minutes, 0, 0);
};

export const formatReservationDateTime = (dateValue: string, timeValue: string) => {
  const date = buildReservationDateTime(dateValue, timeValue);

  if (!date) {
    return "Data indisponivel";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(date);
};
