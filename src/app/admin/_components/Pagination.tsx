import uiStyles from './AdminUi.module.css';

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

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className={uiStyles.paginationBar}>
      <p className={uiStyles.paginationInfo}>
        {totalItems}개 중 {startItem}-{endItem}개 표시
      </p>

      <div className={uiStyles.paginationControls}>
        <button
          type="button"
          className="admin-button admin-button-ghost"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          &#60;
        </button>

        <div className={uiStyles.pageNumberGroup}>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              className={`${uiStyles.pageNumber} ${currentPage === pageNumber ? uiStyles.pageNumberActive : ''}`}
              onClick={() => onPageChange(pageNumber)}
            >
              {pageNumber}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="admin-button admin-button-ghost"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          &#62;
        </button>
      </div>
    </div>
  );
}
