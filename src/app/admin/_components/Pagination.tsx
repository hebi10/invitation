import uiStyles from './AdminUi.module.css';
import { getPaginationItems } from './adminPageUtils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startItem = (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);
  const paginationItems = getPaginationItems(safeCurrentPage, totalPages);

  return (
    <div className={uiStyles.paginationBar}>
      <p className={uiStyles.paginationInfo}>
        {totalItems}개 중 {startItem}-{endItem}개 표시
      </p>

      <div className={uiStyles.paginationControls}>
        <button
          type="button"
          className="admin-button admin-button-ghost"
          aria-label="이전 페이지"
          onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
          disabled={safeCurrentPage === 1}
        >
          &#60;
        </button>

        <div className={uiStyles.pageNumberGroup}>
          {paginationItems.map((item) =>
            typeof item === 'number' ? (
              <button
                key={item}
                type="button"
                className={`${uiStyles.pageNumber} ${safeCurrentPage === item ? uiStyles.pageNumberActive : ''}`}
                aria-current={safeCurrentPage === item ? 'page' : undefined}
                onClick={() => onPageChange(item)}
              >
                {item}
              </button>
            ) : (
              <span key={item} className={uiStyles.pageEllipsis} aria-hidden="true">
                …
              </span>
            )
          )}
        </div>

        <button
          type="button"
          className="admin-button admin-button-ghost"
          aria-label="다음 페이지"
          onClick={() => onPageChange(Math.min(totalPages, safeCurrentPage + 1))}
          disabled={safeCurrentPage === totalPages}
        >
          &#62;
        </button>
      </div>
    </div>
  );
}
