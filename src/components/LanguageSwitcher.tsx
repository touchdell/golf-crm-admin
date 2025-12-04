import React from 'react';
import { IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import { Language } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    handleClose();
  };

  return (
    <>
      <Tooltip title={t('language.switchLanguage')}>
        <IconButton
          color="inherit"
          onClick={handleClick}
          size="small"
          sx={{ ml: 1 }}
        >
          <Language />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem
          onClick={() => handleLanguageChange('en')}
          selected={i18n.language === 'en'}
        >
          {t('language.english')}
        </MenuItem>
        <MenuItem
          onClick={() => handleLanguageChange('th')}
          selected={i18n.language === 'th'}
        >
          {t('language.thai')}
        </MenuItem>
      </Menu>
    </>
  );
};

export default LanguageSwitcher;

